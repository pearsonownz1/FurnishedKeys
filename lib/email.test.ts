import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { POST as review } from "@/app/api/admin/listings/[id]/review/route";
import { submitOwnerLead } from "@/app/(site)/owners/actions";
import { submitInquiry } from "@/app/(site)/rentals/actions";
import { loadOwnerListing, loadRole, loadSetupState, sessionUser } from "@/lib/api/owner-listing";
import {
  DEFAULT_LEADS_NOTIFY_TO,
  deliverInquiryNotice,
  deliverInquiryReply,
  deliverRenterMessageNotice,
  deliverOwnerLeadNotice,
  deliverReviewDecision,
  inquiryNoticeHtml,
  ownerLeadNoticeHtml,
  reviewNoticeHtml,
  sendEmail,
} from "@/lib/email";
import { getPublicListings } from "@/lib/listings";
import { createPublicClient } from "@/lib/supabase/public";
import { createServiceClient } from "@/lib/supabase/service";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api/owner-listing", () => ({
  sessionUser: vi.fn(),
  loadOwnerListing: vi.fn(),
  loadSetupState: vi.fn(),
  loadRole: vi.fn(),
}));

vi.mock("@/lib/listings", () => ({
  getPublicListings: vi.fn(),
}));

vi.mock("@/lib/supabase/public", () => ({
  createPublicClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

const ownerId = "11111111-1111-4111-8111-111111111111";
const listingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const inquiryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function form(extra?: { pets?: string }) {
  const data = new FormData();
  data.set("listingId", listingId);
  data.set("moveIn", "2026-11-01");
  data.set("moveOut", "2027-02-01");
  data.set("occupants", "2");
  data.set("pets", extra?.pets ?? "1 dog");
  data.set("name", "Ada <Lovelace>");
  data.set("email", "ada@example.com");
  data.set("phone", "541-555-0100");
  data.set("message", "A quiet stay.\nPlease write back.");
  return data;
}

function serviceWithOwner(email: string | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: email ? { email } : null,
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  vi.mocked(createServiceClient).mockReturnValue({
    from: vi.fn().mockReturnValue({ select }),
  } as unknown as ReturnType<typeof createServiceClient>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendEmail", () => {
  it("logs the email and does not call Resend when the key is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await sendEmail({
      to: "owner@example.com",
      subject: "New inquiry",
      html: "<p>Hello</p>",
      replyTo: "ada@example.com",
    });

    expect(result).toEqual({ id: null, detail: "skipped:no-key" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(
      "email skipped (no RESEND_API_KEY)",
      expect.objectContaining({
        to: "owner@example.com",
        subject: "New inquiry",
        replyTo: "ada@example.com",
        html: "<p>Hello</p>",
      }),
    );
    info.mockRestore();
  });

  it("skips addresses that end in .example and does not call Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await sendEmail({
      to: "renter@mail.example",
      subject: "New inquiry",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({ id: null, detail: "skipped:example-domain" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(
      "email skipped (example domain)",
      expect.objectContaining({ to: "renter@mail.example", detail: "skipped:example-domain" }),
    );
    info.mockRestore();
  });

  it("posts to Resend and returns the id", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "re_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await sendEmail({
      to: "owner@example.com",
      subject: "New inquiry for Pine ADU",
      html: "<p>Hello</p>",
      replyTo: "ada@example.com",
    });

    expect(result).toEqual({ id: "re_123", detail: "sent:re_123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      from: "Furnished Keys <hello@furnishedkeys.com>",
      to: ["owner@example.com"],
      subject: "New inquiry for Pine ADU",
      html: "<p>Hello</p>",
      reply_to: "ada@example.com",
    });
    expect(String((init.headers as Record<string, string>).Authorization)).toBe("Bearer re_test_key");
  });

  it("logs a Resend error and does not throw", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ message: "domain not verified" }),
      }),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendEmail({ to: "owner@example.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).resolves.toEqual({ id: null, detail: "failed:422:domain not verified" });
    expect(error).toHaveBeenCalledWith("email failed", 422, "domain not verified");
    error.mockRestore();
  });
});

describe("notice html", () => {
  it("includes the inquiry fields, escapes them, and links to the dashboard inquiry", () => {
    const html = inquiryNoticeHtml({
      listingTitle: "Pine <ADU>",
      renterName: "Ada <Lovelace>",
      renterEmail: "ada@<example>.com",
      renterPhone: "541-555-0100",
      moveIn: "2026-11-01",
      moveOut: "2027-02-01",
      occupants: 2,
      pets: null,
      message: "Line one\n<script>",
      inquiryUrl: "https://furnishedkeys.com/owner#inquiry-" + inquiryId,
    });
    expect(html).toContain("Pine &lt;ADU&gt;");
    expect(html).toContain("Ada &lt;Lovelace&gt;");
    expect(html).toContain("ada@&lt;example&gt;.com");
    expect(html).toContain("541-555-0100");
    expect(html).toContain("2026-11-01 to 2027-02-01");
    expect(html).toContain("Occupants");
    expect(html).toContain(">2<");
    expect(html).toContain("None");
    expect(html).toContain("Line one<br>&lt;script&gt;");
    expect(html).toContain(`https://furnishedkeys.com/owner#inquiry-${inquiryId}`);
    expect(html).not.toContain("<script>");
  });

  it("includes the review note for changes requested", () => {
    const html = reviewNoticeHtml({
      listingTitle: "Pine ADU",
      decision: "changes_requested",
      note: "Add a cover photo.",
      dashboardUrl: "https://furnishedkeys.com/owner",
    });
    expect(html).toContain("Changes were requested");
    expect(html).toContain("Add a cover photo.");
    expect(html).toContain("https://furnishedkeys.com/owner");
  });
});

describe("deliverInquiryNotice", () => {
  it("emails the owner with reply-to set to the renter", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
    serviceWithOwner("owner@example.com");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "re_inquiry" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});

    await deliverInquiryNotice({
      ownerId,
      listingTitle: "Pine ADU",
      inquiryId,
      renterName: "Ada",
      renterEmail: "ada@example.com",
      renterPhone: "541-555-0100",
      moveIn: "2026-11-01",
      moveOut: "2027-02-01",
      occupants: 2,
      pets: "1 dog",
      message: "Hello",
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.reply_to).toBe("ada@example.com");
    expect(body.subject).toBe("New inquiry for Pine ADU");
    expect(body.html).toContain("1 dog");
    expect(body.html).toContain("ada@example.com");
    expect(body.html).toContain("541-555-0100");
    expect(body.html).toContain(`#inquiry-${inquiryId}`);
  });

  it("does not throw when the owner cannot be loaded", async () => {
    vi.mocked(createServiceClient).mockReturnValue(null);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      deliverInquiryNotice({
        ownerId,
        listingTitle: "Pine ADU",
        inquiryId,
        renterName: "Ada",
        renterEmail: "ada@example.com",
        renterPhone: null,
        moveIn: "2026-11-01",
        moveOut: "2027-02-01",
        occupants: 1,
        pets: null,
        message: "Hello",
      }),
    ).resolves.toEqual({ id: null, detail: "skipped:no-service-client" });
    expect(error).toHaveBeenCalledWith("email skipped: service client is not configured");
    error.mockRestore();
  });

  it("skips the owner when notify_email is false", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { email: "owner@example.com", notify_email: false },
      error: null,
    });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    } as unknown as ReturnType<typeof createServiceClient>);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await deliverInquiryNotice({
      ownerId,
      listingTitle: "Pine ADU",
      inquiryId,
      renterName: "Ada",
      renterEmail: "ada@example.com",
      renterPhone: null,
      moveIn: "2026-11-01",
      moveOut: "2027-02-01",
      occupants: 1,
      pets: null,
      message: "Hello",
    });

    expect(result).toEqual({ id: null, detail: "skipped:notify-email" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("submitInquiry", () => {
  it("sends after a successful insert and still succeeds when email throws", async () => {
    vi.mocked(getPublicListings).mockResolvedValue([
      {
        id: listingId,
        owner_id: ownerId,
        title: "Pine ADU",
        min_stay_months: 1,
        max_occupants: 4,
        pets_allowed: true,
        availability_windows: [],
      },
    ] as unknown as Awaited<ReturnType<typeof getPublicListings>>);
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createPublicClient).mockReturnValue({
      from: () => ({ insert }),
    } as unknown as ReturnType<typeof createPublicClient>);

    const email = vi.spyOn(await import("@/lib/email"), "deliverInquiryNotice");
    email.mockRejectedValueOnce(new Error("resend down"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitInquiry({ ok: false }, form());

    expect(result).toEqual({ ok: true, success: true });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        listing_id: listingId,
        name: "Ada <Lovelace>",
        email: "ada@example.com",
        status: "new",
        renter_token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(email).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId,
        listingTitle: "Pine ADU",
        renterEmail: "ada@example.com",
        renterPhone: "541-555-0100",
        pets: "1 dog",
      }),
    );
    expect(logged).toHaveBeenCalledWith("inquiry email failed", "resend down");
    email.mockRestore();
    logged.mockRestore();
  });

  it("does not email when the insert fails", async () => {
    vi.mocked(getPublicListings).mockResolvedValue([
      {
        id: listingId,
        owner_id: ownerId,
        title: "Pine ADU",
        min_stay_months: 1,
        max_occupants: 4,
        pets_allowed: true,
        availability_windows: [],
      },
    ] as unknown as Awaited<ReturnType<typeof getPublicListings>>);
    vi.mocked(createPublicClient).mockReturnValue({
      from: () => ({
        insert: vi.fn().mockResolvedValue({ error: { message: "no", code: "42501" } }),
      }),
    } as unknown as ReturnType<typeof createPublicClient>);
    const email = vi.spyOn(await import("@/lib/email"), "deliverInquiryNotice");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitInquiry({ ok: false }, form({ pets: "" }));

    expect(result.ok).toBe(false);
    expect(email).not.toHaveBeenCalled();
    email.mockRestore();
  });

  it("rejects a demo listing before insert or email", async () => {
    vi.mocked(getPublicListings).mockResolvedValue([
      {
        id: listingId,
        owner_id: ownerId,
        title: "Sample ADU",
        is_demo: true,
        min_stay_months: 1,
        max_occupants: 4,
        pets_allowed: true,
        availability_windows: [],
      },
    ] as unknown as Awaited<ReturnType<typeof getPublicListings>>);
    const insert = vi.fn();
    vi.mocked(createPublicClient).mockReturnValue({
      from: () => ({ insert }),
    } as unknown as ReturnType<typeof createPublicClient>);
    const email = vi.spyOn(await import("@/lib/email"), "deliverInquiryNotice");

    const result = await submitInquiry({ ok: false }, form());

    expect(result).toEqual({
      ok: false,
      formError:
        "This is a sample listing, so it can't take inquiries. Browse real homes at /rentals.",
    });
    expect(insert).not.toHaveBeenCalled();
    expect(email).not.toHaveBeenCalled();
    email.mockRestore();
  });
});

describe("POST /api/admin/listings/[id]/review emails", () => {
  const context = { params: Promise.resolve({ id: listingId }) };

  function ready(status: "pending_review" | "draft" = "pending_review") {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: { from: vi.fn().mockReturnValue({ update }) } as unknown as Awaited<
        ReturnType<typeof sessionUser>
      >["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(loadRole).mockResolvedValue("admin");
    vi.mocked(loadOwnerListing).mockResolvedValue({
      id: listingId,
      owner_id: ownerId,
      status,
      title: "Pine ADU",
      description: "A furnished ADU.",
      monthly_rent_cents: 250_000,
      min_stay_months: 1,
      bathrooms: 1,
      slug: "pine-adu",
      listing_fee_status: "unpaid",
      fee_paid_through: null,
      stripe_subscription_id: null,
      renewal_canceled: false,
    } as Awaited<ReturnType<typeof loadOwnerListing>>);
    vi.mocked(loadSetupState).mockResolvedValue({
      photos: [{ id: "photo-1", is_cover: true, sort: 0 }],
      photoCount: 1,
      hasCover: true,
      bedroomCount: 1,
    });
    serviceWithOwner("owner@example.com");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
  }

  it("emails approval, a changes note, and rejection without failing the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "re_review" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});

    ready();
    const approved = await review(
      new Request("https://preview.furnishedkeys.com/api/admin/listings/x/review", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-host": "preview.furnishedkeys.com" },
        body: JSON.stringify({ action: "approve" }),
      }),
      context,
    );
    expect(approved.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/rentals/pine-adu");
    expect(revalidatePath).toHaveBeenCalledWith("/rentals");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    const approvedBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(approvedBody.subject).toBe("Listing approved: Pine ADU");
    expect(approvedBody.html).toContain("is approved");
    expect(approvedBody.html).toContain("https://preview.furnishedkeys.com/owner");
    expect(approvedBody.reply_to).toBeUndefined();

    fetchMock.mockClear();
    ready();
    const changes = await review(
      new Request("https://furnishedkeys.com/api/admin/listings/x/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request_changes", note: "Add a cover <photo>." }),
      }),
      context,
    );
    expect(changes.status).toBe(200);
    const changesBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(changesBody.subject).toBe("Changes requested: Pine ADU");
    expect(changesBody.html).toContain("Add a cover &lt;photo&gt;.");

    fetchMock.mockClear();
    ready("draft");
    const rejected = await review(
      new Request("https://furnishedkeys.com/api/admin/listings/x/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reject", note: "Not a fit." }),
      }),
      context,
    );
    expect(rejected.status).toBe(200);
    const rejectedBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(rejectedBody.subject).toBe("Listing not approved: Pine ADU");
    expect(rejectedBody.html).toContain("Not a fit.");
  });

  it("still returns 200 when Resend throws", async () => {
    ready();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await review(
      new Request("https://furnishedkeys.com/api/admin/listings/x/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      context,
    );
    expect(response.status).toBe(200);
  });
});

describe("deliverReviewDecision", () => {
  it("does not throw when sending fails", async () => {
    serviceWithOwner("owner@example.com");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      deliverReviewDecision({
        ownerId,
        listingTitle: "Pine ADU",
        decision: "rejected",
        note: "Not a fit.",
        origin: "https://furnishedkeys.com",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("deliverRenterMessageNotice", () => {
  it("emails the owner with a thread button and skips when notify_email is false", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
    serviceWithOwner("delivered+owner@resend.dev");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "re_thread" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});

    const sent = await deliverRenterMessageNotice({
      ownerId,
      listingTitle: "Pine ADU",
      inquiryId,
    });
    expect(sent.detail).toBe("sent:re_thread");
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.subject).toBe("New message about Pine ADU");
    expect(body.html).toContain(`/owner/inquiries/${inquiryId}`);

    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { email: "delivered+owner@resend.dev", notify_email: false },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);
    const skipped = await deliverRenterMessageNotice({
      ownerId,
      listingTitle: "Pine ADU",
      inquiryId,
    });
    expect(skipped).toEqual({ id: null, detail: "skipped:notify-email" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("deliverInquiryReply", () => {
  it("emails the renter with the owner's reply-to and an escaped body", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "re_reply" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await deliverInquiryReply({
      to: "delivered+renter@resend.dev",
      listingTitle: "Pine ADU",
      body: "Yes.\n<script>",
      replyTo: "delivered+owner@resend.dev",
      inquiryUrl: "https://furnishedkeys.com/inquiry/raw-token",
    });

    expect(result).toEqual({ id: "re_reply", detail: "sent:re_reply" });
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.to).toEqual(["delivered+renter@resend.dev"]);
    expect(body.subject).toBe("Re: your inquiry for Pine ADU");
    expect(body.reply_to).toBe("delivered+owner@resend.dev");
    expect(body.html).toContain("Yes.<br>&lt;script&gt;");
    expect(body.html).toContain("https://furnishedkeys.com/inquiry/raw-token");
    expect(body.html).not.toContain("<script>");
  });
});

describe("deliverOwnerLeadNotice", () => {
  const lead = {
    name: "Guy <script>",
    email: "owner@example.com",
    phone: "541-555-0199",
    interest: "full_management",
    propertyType: "house",
    furnished: "yes",
    locationId: "c3a1e0b2-4d5f-4a6b-8c7d-111111111101",
    propertyAddress: "10 <Pine> St",
    currentUse: "vacant",
    availableFrom: "2026-12-01",
    notes: "Call after 5",
    source: "web",
  };

  it("sends to LEADS_NOTIFY_TO, escapes fields, and sets reply-to", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
    vi.stubEnv("LEADS_NOTIFY_TO", "delivered+leads@resend.dev");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "re_lead" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await deliverOwnerLeadNotice(lead);

    expect(result).toEqual({ id: "re_lead", detail: "sent:re_lead" });
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.to).toEqual(["delivered+leads@resend.dev"]);
    expect(body.subject).toBe("New owner lead: full_management – 10 <Pine> St");
    expect(body.reply_to).toBe("owner@example.com");
    expect(body.html).toContain("Guy &lt;script&gt;");
    expect(body.html).toContain("10 &lt;Pine&gt; St");
    expect(body.html).toContain("Bend");
    expect(body.html).not.toContain("<script>");
    expect(ownerLeadNoticeHtml(lead)).toContain("full_management");
  });

  it("falls back to Guy's address when LEADS_NOTIFY_TO is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Furnished Keys <hello@furnishedkeys.com>");
    vi.stubEnv("LEADS_NOTIFY_TO", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "re_lead_default" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});

    await deliverOwnerLeadNotice(lead);

    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.to).toEqual([DEFAULT_LEADS_NOTIFY_TO]);
  });
});

describe("submitOwnerLead", () => {
  function leadForm() {
    const data = new FormData();
    data.set("name", "Pat Owner");
    data.set("email", "pat@example.com");
    data.set("phone", "541-555-0142");
    data.set("interest", "list_myself");
    data.set("propertyType", "adu");
    data.set("furnished", "partly");
    data.set("locationId", "c3a1e0b2-4d5f-4a6b-8c7d-111111111101");
    data.set("propertyAddress", "20 Sample St");
    data.set("currentUse", "second home");
    data.set("availableFrom", "2026-11-15");
    data.set("notes", "Ask about winter");
    data.set("source", "web");
    return data;
  }

  it("emails after a successful insert and still succeeds when email throws", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createPublicClient).mockReturnValue({
      from: () => ({ insert }),
    } as unknown as ReturnType<typeof createPublicClient>);
    const email = vi.spyOn(await import("@/lib/email"), "deliverOwnerLeadNotice");
    email.mockRejectedValueOnce(new Error("resend down"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitOwnerLead({ ok: false }, leadForm());

    expect(result).toEqual({ ok: true, success: true });
    expect(insert).toHaveBeenCalled();
    expect(email).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "pat@example.com",
        interest: "list_myself",
        propertyAddress: "20 Sample St",
      }),
    );
    expect(logged).toHaveBeenCalledWith("owner lead email failed", "resend down");
    email.mockRestore();
    logged.mockRestore();
  });

  it("does not email when the insert fails", async () => {
    vi.mocked(createPublicClient).mockReturnValue({
      from: () => ({
        insert: vi.fn().mockResolvedValue({ error: { message: "no", code: "42501" } }),
      }),
    } as unknown as ReturnType<typeof createPublicClient>);
    const email = vi.spyOn(await import("@/lib/email"), "deliverOwnerLeadNotice");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await submitOwnerLead({ ok: false }, leadForm());

    expect(result.ok).toBe(false);
    expect(email).not.toHaveBeenCalled();
    email.mockRestore();
  });
});
