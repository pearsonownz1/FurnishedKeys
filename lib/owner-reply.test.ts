import { beforeEach, describe, expect, it, vi } from "vitest";
import { declineInquiry, replyToInquiry } from "@/app/(site)/owner/actions";
import { sessionUser } from "@/lib/api/owner-listing";
import { deliverInquiryDecline, deliverInquiryReply } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/service";

vi.mock("@/lib/api/owner-listing", () => ({
  sessionUser: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  deliverInquiryReply: vi.fn(),
  deliverInquiryDecline: vi.fn(),
  publicOrigin: vi.fn().mockResolvedValue("https://furnishedkeys.com"),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

const ownerId = "11111111-1111-4111-8111-111111111111";
const listingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const inquiryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function form(body = "We can hold those dates.", id = inquiryId) {
  const data = new FormData();
  data.set("inquiryId", id);
  data.set("body", body);
  return data;
}

const messageId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function client() {
  const messageInsert = vi.fn().mockReturnValue({
    select: () => ({
      single: vi.fn().mockResolvedValue({ data: { id: messageId }, error: null }),
    }),
  });
  const statusEq = vi.fn().mockResolvedValue({ error: null });
  const statusUpdate = vi.fn().mockReturnValue({ eq: statusEq });
  const tokenEq = vi.fn().mockResolvedValue({ error: null });
  const tokenUpdate = vi.fn().mockReturnValue({ eq: tokenEq });
  const emailedEq = vi.fn().mockResolvedValue({ error: null });
  const emailedUpdate = vi.fn().mockReturnValue({ eq: emailedEq });
  vi.mocked(createServiceClient).mockReturnValue({
    from(table: string) {
      if (table === "messages") return { update: emailedUpdate };
      return { update: tokenUpdate };
    },
  } as unknown as ReturnType<typeof createServiceClient>);
  const inquiryMaybe = vi.fn().mockResolvedValue({
    data: {
      id: inquiryId,
      email: "delivered+renter@resend.dev",
      listing_id: listingId,
    },
    error: null,
  });
  const listingMaybe = vi.fn().mockResolvedValue({
    data: { title: "Pine ADU" },
    error: null,
  });
  const profileMaybe = vi.fn().mockResolvedValue({
    data: { email: "delivered+owner@resend.dev" },
    error: null,
  });

  const supabase = {
    from(table: string) {
      if (table === "messages") return { insert: messageInsert };
      if (table === "inquiries") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: inquiryMaybe }) }),
          update: statusUpdate,
        };
      }
      if (table === "listings") {
        return { select: () => ({ eq: () => ({ maybeSingle: listingMaybe }) }) };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: profileMaybe }) }) };
    },
  };

  return { supabase, messageInsert, statusUpdate, statusEq, tokenUpdate, emailedUpdate, emailedEq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("replyToInquiry", () => {
  it("requires a session", async () => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {} as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: null,
    });

    const result = await replyToInquiry({ ok: false }, form());

    expect(result).toEqual({ ok: false, formError: "Sign in again." });
    expect(deliverInquiryReply).not.toHaveBeenCalled();
  });

  it("rejects an empty or oversized reply", async () => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: { from: vi.fn() } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });

    expect(await replyToInquiry({ ok: false }, form("   "))).toEqual({
      ok: false,
      formError: "Write a reply between 1 and 8000 characters.",
    });
    expect(await replyToInquiry({ ok: false }, form("x".repeat(8001)))).toEqual({
      ok: false,
      formError: "Write a reply between 1 and 8000 characters.",
    });
    expect(deliverInquiryReply).not.toHaveBeenCalled();
  });

  it("inserts a message, marks the inquiry responded, and emails the renter", async () => {
    const db = client();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: db.supabase as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(deliverInquiryReply).mockResolvedValue({ id: "re_reply", detail: "sent:re_reply" });

    const result = await replyToInquiry({ ok: false }, form("Yes, those dates work."));

    expect(result).toEqual({ ok: true, success: true });
    expect(db.messageInsert).toHaveBeenCalledWith({
      inquiry_id: inquiryId,
      sender_id: ownerId,
      sender_role: "owner",
      body: "Yes, those dates work.",
    });
    expect(db.statusUpdate).toHaveBeenCalledWith({ status: "responded" });
    expect(db.statusEq).toHaveBeenCalledWith("id", inquiryId);
    expect(deliverInquiryReply).toHaveBeenCalledWith({
      to: "delivered+renter@resend.dev",
      listingTitle: "Pine ADU",
      body: "Yes, those dates work.",
      replyTo: "delivered+owner@resend.dev",
      inquiryUrl: expect.stringMatching(/^https:\/\/furnishedkeys\.com\/inquiry\/[A-Za-z0-9_-]+$/),
    });
    expect(db.tokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        renter_token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        renter_unread: 1,
      }),
    );
    expect(db.emailedUpdate).toHaveBeenCalledWith({ emailed: true });
    expect(db.emailedEq).toHaveBeenCalledWith("id", messageId);
  });

  it("still succeeds when the renter email throws", async () => {
    const db = client();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: db.supabase as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(deliverInquiryReply).mockRejectedValue(new Error("resend down"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await replyToInquiry({ ok: false }, form());

    expect(result).toEqual({ ok: true, success: true });
    expect(db.messageInsert).toHaveBeenCalled();
    expect(db.emailedUpdate).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalledWith("inquiry reply email failed", "resend down");
    logged.mockRestore();
  });

  it("does not email when the message insert fails", async () => {
    const db = client();
    db.messageInsert.mockReturnValue({
      select: () => ({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "denied", code: "42501" },
        }),
      }),
    });
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: db.supabase as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await replyToInquiry({ ok: false }, form());

    expect(result).toEqual({
      ok: false,
      formError: "We couldn't send this. Please try again.",
    });
    expect(db.statusUpdate).not.toHaveBeenCalled();
    expect(deliverInquiryReply).not.toHaveBeenCalled();
  });

  it("leaves emailed false when Resend does not accept the reply", async () => {
    const db = client();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: db.supabase as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(deliverInquiryReply).mockResolvedValue({ id: null, detail: "skipped:no-key" });

    const result = await replyToInquiry({ ok: false }, form());

    expect(result).toEqual({ ok: true, success: true });
    expect(db.emailedUpdate).not.toHaveBeenCalled();
  });
});

describe("declineInquiry", () => {
  it("declines as the owner and emails the renter with the note", async () => {
    const statusSelect = vi.fn().mockResolvedValue({ data: [{ id: inquiryId }], error: null });
    const statusEq = vi.fn().mockReturnValue({ select: statusSelect });
    const statusUpdate = vi.fn().mockReturnValue({ eq: statusEq });
    const inquiryMaybe = vi.fn().mockResolvedValue({
      data: { id: inquiryId, email: "delivered+renter@resend.dev", listing_id: listingId },
      error: null,
    });
    const listingMaybe = vi.fn().mockResolvedValue({
      data: { title: "Pine ADU", owner_id: ownerId },
      error: null,
    });
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {
        from(table: string) {
          if (table === "inquiries") {
            return {
              select: () => ({ eq: () => ({ maybeSingle: inquiryMaybe }) }),
              update: statusUpdate,
            };
          }
          return { select: () => ({ eq: () => ({ maybeSingle: listingMaybe }) }) };
        },
      } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(deliverInquiryDecline).mockResolvedValue({ id: "re_decline", detail: "sent:re_decline" });

    const data = new FormData();
    data.set("inquiryId", inquiryId);
    data.set("note", "Those dates are taken.\n<script>");
    const result = await declineInquiry({ ok: false }, data);

    expect(result).toEqual({ ok: true, success: true });
    expect(statusUpdate).toHaveBeenCalledWith({ status: "declined" });
    expect(deliverInquiryDecline).toHaveBeenCalledWith({
      to: "delivered+renter@resend.dev",
      listingTitle: "Pine ADU",
      note: "Those dates are taken.\n<script>",
    });
  });

  it("refuses another owner and a note that is too long", async () => {
    const listingMaybe = vi.fn().mockResolvedValue({
      data: { title: "Pine ADU", owner_id: "22222222-2222-4222-8222-222222222222" },
      error: null,
    });
    const inquiryMaybe = vi.fn().mockResolvedValue({
      data: { id: inquiryId, email: "delivered+renter@resend.dev", listing_id: listingId },
      error: null,
    });
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {
        from(table: string) {
          if (table === "inquiries") {
            return { select: () => ({ eq: () => ({ maybeSingle: inquiryMaybe }) }) };
          }
          return { select: () => ({ eq: () => ({ maybeSingle: listingMaybe }) }) };
        },
      } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });

    const other = new FormData();
    other.set("inquiryId", inquiryId);
    expect(await declineInquiry({ ok: false }, other)).toEqual({
      ok: false,
      formError: "That inquiry is not on your board.",
    });
    expect(deliverInquiryDecline).not.toHaveBeenCalled();

    const long = new FormData();
    long.set("inquiryId", inquiryId);
    long.set("note", "x".repeat(2001));
    expect(await declineInquiry({ ok: false }, long)).toEqual({
      ok: false,
      formError: "Keep the note under 2000 characters.",
    });
  });
});
