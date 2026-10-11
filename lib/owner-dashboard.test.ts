import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmAvailability, setBlockedDates } from "@/app/(site)/owner/calendar-actions";
import { renterReply } from "@/app/(site)/inquiry/actions";
import { changePassword, saveProfile } from "@/app/(site)/owner/settings-actions";
import { sessionUser } from "@/lib/api/owner-listing";
import { deliverRenterMessageNotice } from "@/lib/email";
import { loadInbox, loadThread } from "@/lib/owner-dashboard-load";
import {
  agoLabel,
  applyBlockedDays,
  confirmedAgo,
  filterCounts,
  firstName,
  initials,
  inquiryPreview,
  listTime,
  listingActions,
  listingDetailLine,
  listingPercent,
  listingStatusCaption,
  listingStatusGroup,
  listingStepProgress,
  matchesListingFilter,
  progressCaption,
  resumeHref,
  setupProgress,
  stayHitsBlocked,
  stayRange,
  threadMessages,
  type SetupSignals,
} from "@/lib/owner-dashboard";
import { revalidateListingPaths } from "@/lib/listings/revalidate-public";
import { hashRenterToken } from "@/lib/renter-token";
import { createServiceClient } from "@/lib/supabase/service";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/listings/revalidate-public", () => ({
  revalidateListingPaths: vi.fn(),
}));

vi.mock("@/lib/api/owner-listing", () => ({
  sessionUser: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  deliverRenterMessageNotice: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const listingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const inquiryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("draft resume", () => {
  it("points resume_href at the saved wizard step and scores required fields", () => {
    expect(resumeHref(listingId, "photos")).toBe(
      `/owners/listings/${listingId}/setup?step=photos`,
    );
    expect(resumeHref(listingId, null)).toBe(`/owners/listings/${listingId}/setup?step=basics`);
    expect(resumeHref(listingId, "nope")).toBe(`/owners/listings/${listingId}/setup?step=basics`);
    expect(
      listingPercent({
        title: "Pine",
        description: "A home",
        monthly_rent_cents: 100,
        min_stay_months: 1,
        bedroomCount: 1,
        bathrooms: 1,
        photoCount: 1,
        hasCover: true,
      }),
    ).toBe(100);
    expect(
      listingPercent({
        title: "Pine",
        description: null,
        monthly_rent_cents: null,
        min_stay_months: 1,
        bedroomCount: 0,
        bathrooms: null,
        photoCount: 0,
        hasCover: false,
      }),
    ).toBe(25);
  });
});

describe("blocked dates", () => {
  it("adds and removes days without dropping the others", () => {
    expect(applyBlockedDays(["2026-11-01", "2026-11-02"], ["2026-11-03"], true)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(applyBlockedDays(["2026-11-01", "2026-11-02"], ["2026-11-01"], false)).toEqual([
      "2026-11-02",
    ]);
  });

  it("treats a blocked night inside the stay as unavailable", () => {
    expect(stayHitsBlocked("2026-11-01", "2026-11-04", ["2026-11-02"])).toBe(true);
    expect(stayHitsBlocked("2026-11-01", "2026-11-04", ["2026-11-04"])).toBe(false);
  });

  it("refuses another owner's listing before it writes blocked dates", async () => {
    const remove = vi.fn();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          delete: remove,
        }),
      } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: otherId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });

    const result = await setBlockedDates(listingId, ["2026-11-02"], true);

    expect(result).toEqual({ ok: false, formError: "That listing is not yours." });
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("thread access", () => {
  it("does not mark a hidden inquiry read", async () => {
    const update = vi.fn();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
          update,
        }),
      } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: otherId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });

    expect(await loadThread(inquiryId)).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("returns the thread oldest-first and clears the owner unread count", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const inquiryMaybe = vi.fn().mockResolvedValue({
      data: {
        id: inquiryId,
        listing_id: listingId,
        name: "Ada",
        email: "delivered+renter@resend.dev",
        phone: "541-555-0100",
        move_in: "2026-11-01",
        move_out: "2027-02-01",
        occupants: 2,
        pets: null,
        status: "responded",
        message: "Hello",
        owner_unread: 2,
      },
      error: null,
    });
    const listingMaybe = vi.fn().mockResolvedValue({ data: { title: "Pine ADU" }, error: null });
    const messageOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "m1",
          sender_role: "owner",
          body: "Yes",
          emailed: true,
          created_at: "2026-10-01T00:00:00.000Z",
        },
        {
          id: "m2",
          sender_role: "renter",
          body: "Thanks",
          emailed: false,
          created_at: "2026-10-02T00:00:00.000Z",
        },
      ],
      error: null,
    });
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {
        from(table: string) {
          if (table === "listings") {
            return { select: () => ({ eq: () => ({ maybeSingle: listingMaybe }) }) };
          }
          if (table === "messages") {
            return { select: () => ({ eq: () => ({ order: messageOrder }) }) };
          }
          return {
            select: () => ({ eq: () => ({ maybeSingle: inquiryMaybe }) }),
            update: () => ({ eq: updateEq }),
          };
        },
      } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });

    const thread = await loadThread(inquiryId);

    expect(thread?.messages.map((message) => message.sender_role)).toEqual(["owner", "renter"]);
    expect(thread?.messages.map((message) => message.emailed)).toEqual([true, false]);
    expect(thread?.inquiry.owner_unread).toBe(0);
    expect(updateEq).toHaveBeenCalledWith("id", inquiryId);
  });
});

describe("renter reply", () => {
  it("rejects a token that does not match a stored hash", async () => {
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        }),
      }),
    } as unknown as ReturnType<typeof createServiceClient>);

    const form = new FormData();
    form.set("token", "not-the-current-token");
    form.set("body", "Still interested.");

    const result = await renterReply({ ok: false }, form);

    expect(result).toEqual({
      ok: false,
      formError: "This link has expired. Open the newest email from the owner.",
    });
    expect(deliverRenterMessageNotice).not.toHaveBeenCalled();
  });

  it("inserts a renter message and emails the owner", async () => {
    const renterMessageId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const messageInsert = vi.fn().mockReturnValue({
      select: () => ({
        single: vi.fn().mockResolvedValue({ data: { id: renterMessageId }, error: null }),
      }),
    });
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const emailedEq = vi.fn().mockResolvedValue({ error: null });
    const emailedUpdate = vi.fn().mockReturnValue({ eq: emailedEq });
    const gte = vi.fn().mockResolvedValue({ count: 0, error: null });
    const inquiryMaybe = vi.fn().mockResolvedValue({
      data: { id: inquiryId, listing_id: listingId, owner_unread: 0 },
      error: null,
    });
    const listingMaybe = vi.fn().mockResolvedValue({
      data: { title: "Pine ADU", owner_id: ownerId },
      error: null,
    });
    vi.mocked(createServiceClient).mockReturnValue({
      from(table: string) {
        if (table === "messages") {
          return {
            select: () => ({ eq: () => ({ eq: () => ({ gte }) }) }),
            insert: messageInsert,
            update: emailedUpdate,
          };
        }
        if (table === "listings") {
          return { select: () => ({ eq: () => ({ maybeSingle: listingMaybe }) }) };
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: inquiryMaybe }) }),
          update: () => ({ eq: updateEq }),
        };
      },
    } as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(deliverRenterMessageNotice).mockResolvedValue({ id: "re_1", detail: "sent:re_1" });

    const token = "abcDEF123_-token";
    const form = new FormData();
    form.set("token", token);
    form.set("body", "We can move in earlier.");
    const result = await renterReply({ ok: false }, form);

    expect(result).toEqual({ ok: true, success: true });
    expect(inquiryMaybe).toHaveBeenCalled();
    expect(messageInsert).toHaveBeenCalledWith({
      inquiry_id: inquiryId,
      sender_id: null,
      sender_role: "renter",
      body: "We can move in earlier.",
    });
    expect(deliverRenterMessageNotice).toHaveBeenCalledWith({
      ownerId,
      listingTitle: "Pine ADU",
      inquiryId,
    });
    expect(emailedUpdate).toHaveBeenCalledWith({ emailed: true });
    expect(emailedEq).toHaveBeenCalledWith("id", renterMessageId);
    expect(hashRenterToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("stops at 20 renter messages in an hour", async () => {
    const messageInsert = vi.fn();
    vi.mocked(createServiceClient).mockReturnValue({
      from(table: string) {
        if (table === "messages") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({ gte: vi.fn().mockResolvedValue({ count: 20, error: null }) }),
              }),
            }),
            insert: messageInsert,
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: inquiryId, listing_id: listingId, owner_unread: 0 },
                error: null,
              }),
            }),
          }),
        };
      },
    } as unknown as ReturnType<typeof createServiceClient>);

    const form = new FormData();
    form.set("token", "current-token");
    form.set("body", "One more note.");
    const result = await renterReply({ ok: false }, form);

    expect(result).toEqual({
      ok: false,
      formError: "Please wait before sending another message.",
    });
    expect(messageInsert).not.toHaveBeenCalled();
  });
});

describe("settings", () => {
  it("saves the profile and refuses a short new password", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {
        from: () => ({ update }),
        auth: {},
      } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId, email: "delivered+owner@resend.dev" } as NonNullable<
        Awaited<ReturnType<typeof sessionUser>>["user"]
      >,
    });

    const profile = new FormData();
    profile.set("full_name", "Ada");
    profile.set("phone", "541-555-0100");
    profile.set("notify_new_inquiry", "true");
    profile.set("notify_new_message", "on");
    expect(await saveProfile({ ok: false }, profile)).toEqual({ ok: true, success: true });
    expect(update).toHaveBeenCalledWith({
      full_name: "Ada",
      phone: "541-555-0100",
      notify_new_inquiry: true,
      notify_new_message: true,
      notify_listing_status: false,
    });

    const password = new FormData();
    password.set("current_password", "old-password");
    password.set("new_password", "short");
    expect(await changePassword({ ok: false }, password)).toEqual({
      ok: false,
      fieldErrors: { new_password: "Use at least 8 characters." },
    });
  });
});

describe("renter thread RLS", () => {
  it("keeps anon off messages and limits owner writes to their own rows", () => {
    const migration = readFileSync(
      new URL("../supabase/migrations/20261011182034_owner_dashboard_backend.sql", import.meta.url),
      "utf8",
    );
    const blocked = readFileSync(
      new URL("../supabase/migrations/20261011070000_listing_setup_fields.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain("revoke all on table public.messages from anon");
    expect(migration).toContain("sender_role = 'owner'");
    expect(migration).toContain("sender_id = (select auth.uid())");
    expect(migration).toContain("private.can_read_inquiry(inquiry_id)");
    expect(migration).toContain("Only the server can rotate the renter link");
    expect(blocked).toContain("listing_blocked_dates_owner_all");
    expect(blocked).toContain("private.owns_listing(listing_id)");
    expect(blocked).toContain("grant insert, update, delete on table public.listing_blocked_dates to authenticated");
    const layout = readFileSync(
      new URL("../supabase/migrations/20261011184418_owner_dashboard_layout.sql", import.meta.url),
      "utf8",
    );
    expect(layout).toContain("add value if not exists 'declined'");
    expect(layout).toContain("notify_new_inquiry");
    expect(layout).toContain("notify_new_message");
    expect(layout).toContain("notify_listing_status");
    expect(layout).toContain("drop column notify_email");
    expect(layout).toContain("Only the server can mark a message emailed");
  });
});

describe("listing cards", () => {
  it("numbers the resume step and groups status for the filter tabs", () => {
    expect(listingStepProgress("photos")).toEqual({
      step_index: 3,
      step_count: 10,
      next_step_label: "Photos",
    });
    expect(listingStepProgress(null)).toEqual({
      step_index: 1,
      step_count: 10,
      next_step_label: "Basics",
    });
    expect(listingStatusGroup("draft")).toBe("draft");
    expect(listingStatusGroup("rejected")).toBe("draft");
    expect(listingStatusGroup("changes_requested")).toBe("draft");
    expect(listingStatusGroup("archived")).toBe("draft");
    expect(listingStatusGroup("pending_review")).toBe("review");
    expect(listingStatusGroup("approved")).toBe("live");
  });
});

describe("confirmAvailability", () => {
  it("stamps the public confirmation fields and revalidates the property page", async () => {
    const windowEq = vi.fn().mockResolvedValue({ error: null });
    const windowUpdate = vi.fn().mockReturnValue({ eq: windowEq });
    const listingEq = vi.fn().mockResolvedValue({ error: null });
    const listingUpdate = vi.fn().mockReturnValue({ eq: listingEq });
    const listingMaybe = vi.fn().mockResolvedValue({
      data: { id: listingId, slug: "pine-adu", owner_id: ownerId },
      error: null,
    });
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {
        from(table: string) {
          if (table === "availability_windows") return { update: windowUpdate };
          return {
            select: () => ({ eq: () => ({ maybeSingle: listingMaybe }) }),
            update: listingUpdate,
          };
        },
      } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });

    const result = await confirmAvailability(listingId);

    expect(result).toEqual({ ok: true });
    expect(windowUpdate).toHaveBeenCalledWith({
      last_confirmed_at: expect.any(String),
      confirmed_by: ownerId,
    });
    expect(listingUpdate).toHaveBeenCalledWith({
      calendar_updated_at: expect.any(String),
    });
    expect(revalidateListingPaths).toHaveBeenCalledWith("pine-adu");
  });

  it("refuses another owner", async () => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: listingId, slug: "pine-adu", owner_id: otherId },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });

    expect(await confirmAvailability(listingId)).toEqual({
      ok: false,
      formError: "That listing is not yours.",
    });
    expect(revalidateListingPaths).not.toHaveBeenCalled();
  });
});

describe("loadInbox", () => {
  it("returns declined threads and the unread total", async () => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {
        from(table: string) {
          if (table === "listings") {
            return {
              select: () => ({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: listingId, title: "Pine ADU" }],
                  error: null,
                }),
              }),
            };
          }
          if (table === "messages") {
            return {
              select: () => ({
                in: () => ({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              in: () => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: inquiryId,
                      listing_id: listingId,
                      name: "Ada",
                      email: "delivered+renter@resend.dev",
                      phone: null,
                      move_in: "2026-11-01",
                      move_out: null,
                      occupants: 1,
                      pets: null,
                      status: "declined",
                      message: "Hello",
                      owner_unread: 1,
                      last_message_at: "2026-10-11T00:00:00.000Z",
                    },
                    {
                      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                      listing_id: listingId,
                      name: "Bea",
                      email: "delivered+bea@resend.dev",
                      phone: null,
                      move_in: "2026-12-01",
                      move_out: null,
                      occupants: 1,
                      pets: null,
                      status: "new",
                      message: "Hi",
                      owner_unread: 2,
                      last_message_at: "2026-10-10T00:00:00.000Z",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        },
      } as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });

    const inbox = await loadInbox();
    expect(inbox.unread_total).toBe(3);
    expect(inbox.inquiries.map((row) => row.status)).toEqual(["declined", "new"]);
  });

  it("returns an empty inbox when signed out", async () => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {} as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: null,
    });
    expect(await loadInbox()).toEqual({ inquiries: [], unread_total: 0 });
  });
});

const now = new Date("2026-10-11T18:30:00.000Z");

function signals(patch: Partial<SetupSignals> = {}): SetupSignals {
  return {
    title: "",
    bedroomCount: 0,
    bathrooms: null,
    photoCount: 0,
    description: "",
    goodFor: [],
    amenities: [],
    monthlyRentCents: null,
    availableFrom: null,
    houseRules: null,
    petPolicy: null,
    petsAllowed: false,
    smokingAllowed: false,
    ...patch,
  };
}

describe("owner dashboard progress", () => {
  it("starts on basics", () => {
    const progress = setupProgress(signals());
    expect(progressCaption(progress)).toBe("Step 1 of 5 · Basics next");
    expect(progress.percent).toBe(20);
    expect(progress.setupStep).toBe("basics");
  });

  it("names photos as step 2 once the home facts are in", () => {
    const progress = setupProgress(
      signals({ title: "Charming Home on West Side", bedroomCount: 1, bathrooms: 1 }),
    );
    expect(progressCaption(progress)).toBe("Step 2 of 5 · Photos next");
    expect(progress.percent).toBe(40);
  });

  it("fills the bar once every setup group has a value", () => {
    const progress = setupProgress(
      signals({
        title: "Orchard",
        bedroomCount: 1,
        bathrooms: 1,
        photoCount: 2,
        description: "A quiet one-bedroom.",
        goodFor: ["remote_workers"],
        amenities: ["wifi"],
        monthlyRentCents: 185_000,
        availableFrom: "2026-11-01",
        houseRules: "Quiet after 10.",
      }),
    );
    expect(progress.complete).toBe(true);
    expect(progress.percent).toBe(100);
    expect(progressCaption(progress)).toBe("Ready to submit");
    expect(progress.setupStep).toBe("review");
  });
});

describe("owner dashboard listing cards", () => {
  it("keeps a draft on city and type, and a live home on beds and rent", () => {
    expect(
      listingDetailLine({
        status: "draft",
        city: "Bend",
        typeLabel: "ADU",
        bedLabel: "1 bed",
        rentLabel: null,
      }),
    ).toBe("Bend · ADU");
    expect(
      listingDetailLine({
        status: "live",
        city: "Bend",
        typeLabel: "ADU",
        bedLabel: "1 bed",
        rentLabel: "$1,850/mo",
      }),
    ).toBe("Bend · 1 bed · $1,850/mo");
  });

  it("gives a draft continue setup and a live home edit plus confirm", () => {
    const draft = listingActions({
      id: "11111111-1111-4111-8111-111111111111",
      status: "draft",
      slug: null,
      progress: setupProgress(signals({ title: "Home", bedroomCount: 1, bathrooms: 1 })),
    });
    expect(draft.actions.map((action) => action.label)).toEqual(["Continue setup"]);
    expect(draft.cardHref).toContain("step=photos");
    expect(draft.actions[0]?.tone).toBe("primary");

    const live = listingActions({
      id: "22222222-2222-4222-8222-222222222222",
      status: "live",
      slug: "orchard",
      progress: setupProgress(signals({ title: "Home", bedroomCount: 1, bathrooms: 1, photoCount: 1, description: "Hi", goodFor: ["students"], amenities: ["wifi"], monthlyRentCents: 100, availableFrom: "2026-11-01", houseRules: "None" })),
    });
    expect(live.actions.map((action) => action.label)).toEqual(["Edit", "Confirm dates"]);
    expect(live.actions.every((action) => action.tone === "secondary")).toBe(true);
    expect(live.actions[1]?.href).toContain("/owner/calendar?listing=");
  });

  it("counts the filter tabs and writes the live caption", () => {
    expect(
      filterCounts([
        { status: "draft" },
        { status: "in_review" },
        { status: "live" },
        { status: "rejected" },
      ]),
    ).toEqual({ all: 4, drafts: 1, review: 1, live: 1 });
    expect(matchesListingFilter("changes_requested", "review")).toBe(true);
    const progress = setupProgress(signals());
    expect(
      listingStatusCaption({
        status: "live",
        progress,
        submittedOn: null,
        confirmedAgo: "3 days ago",
        inquiryCount: 2,
        adminNote: null,
      }),
    ).toBe("Calendar confirmed 3 days ago · 2 inquiries");
    expect(
      listingStatusCaption({
        status: "in_review",
        progress,
        submittedOn: "Oct 10",
        confirmedAgo: null,
        inquiryCount: 0,
        adminNote: null,
      }),
    ).toBe("Submitted Oct 10 · usually 1 business day");
  });
});

describe("owner dashboard inbox", () => {
  it("formats list time, stay dates, and a thread the composer can extend", () => {
    expect(listTime("2026-10-11T16:30:00.000Z", now)).toBe("2h");
    expect(agoLabel("2026-10-11T16:30:00.000Z", now)).toBe("2h ago");
    expect(listTime("2026-10-10T18:30:00.000Z", now)).toBe("Yesterday");
    expect(stayRange("2026-12-01", "2027-03-01")).toBe("Dec 1 – Mar 1");
    expect(confirmedAgo("2026-10-08T18:30:00.000Z", now)).toBe("3 days ago");
    expect(firstName("Jordan M.")).toBe("Jordan");
    expect(initials("Jordan M.", "jordan@email.com")).toBe("JM");

    const messages = threadMessages({
      inquiryId: "inq",
      body: "Is the washer in-unit?",
      createdAt: "2026-10-11T16:30:00.000Z",
      renterName: "Jordan M.",
      ownerId: "owner",
      now,
      replies: [
        {
          id: "m1",
          body: "Yes, it is in the unit.",
          createdAt: "2026-10-11T17:30:00.000Z",
          senderId: "owner",
        },
        {
          id: "m2",
          body: "Great! What's the next step?",
          createdAt: "2026-10-11T18:18:00.000Z",
          senderId: "renter",
        },
      ],
    });
    expect(messages.map((message) => message.from)).toEqual(["renter", "owner", "renter"]);
    expect(messages[1]).toMatchObject({ name: "You", emailed: true });
    expect(inquiryPreview(messages)).toBe("Great! What's the next step?");
    expect(inquiryPreview(messages.slice(0, 2))).toBe("You: Yes, it is in the unit.");
  });
});
