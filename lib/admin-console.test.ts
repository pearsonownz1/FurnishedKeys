import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveListing,
  republishListing,
  requestChanges,
  unpublishListing,
  updateLeadNotes,
  updateLeadStatus,
} from "@/app/(site)/admin/actions";
import { loadAdminCounts } from "@/lib/admin-load";
import { loadRole, loadOwnerListing, loadSetupState, sessionUser } from "@/lib/api/owner-listing";
import { leadSourceLabel, reviewChecklist } from "@/lib/admin-review";
import { deliverReviewDecision, publicOrigin } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/service";

vi.mock("next/navigation", () => ({
  forbidden: () => {
    throw new Error("FORBIDDEN");
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api/owner-listing", () => ({
  sessionUser: vi.fn(),
  loadRole: vi.fn(),
  loadOwnerListing: vi.fn(),
  loadSetupState: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  deliverReviewDecision: vi.fn(),
  publicOrigin: vi.fn(async () => "https://www.furnishedkeys.com"),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

const adminId = "11111111-1111-4111-8111-111111111111";
const listingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const leadId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const complete: Parameters<typeof reviewChecklist>[0] = {
  photoCount: 5,
  hasCover: true,
  description: "A furnished place for a few months.",
  monthlyRentCents: 250_000,
  feeCount: 2,
  hasAvailability: true,
  amenityCount: 3,
  houseRules: "No smoking.",
  address: "10 Pine Street",
  lat: 44.06,
  lng: -121.31,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reviewChecklist", () => {
  it("passes when photos, fees, rules, and the map pin are present", () => {
    expect(reviewChecklist(complete).every((item) => item.ok)).toBe(true);
    expect(reviewChecklist(complete).map((item) => item.key)).toEqual([
      "photos",
      "cover",
      "description",
      "rent",
      "fees",
      "availability",
      "amenities",
      "house_rules",
      "address",
    ]);
  });

  it("fails photos under 5, a missing pin, and empty fees", () => {
    const checks = reviewChecklist({
      ...complete,
      photoCount: 4,
      feeCount: 0,
      lat: null,
      description: "  ",
    });
    const byKey = Object.fromEntries(checks.map((item) => [item.key, item.ok]));
    expect(byKey.photos).toBe(false);
    expect(byKey.fees).toBe(false);
    expect(byKey.address).toBe(false);
    expect(byKey.description).toBe(false);
    expect(byKey.cover).toBe(true);
    expect(byKey.rent).toBe(true);
  });

  it("labels a letter lead and every other source", () => {
    expect(leadSourceLabel("letter")).toBe("Letter (QR)");
    expect(leadSourceLabel("web")).toBe("/owners");
  });
});

describe("admin gate", () => {
  it("stops a non-admin before the service client", async () => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {} as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: adminId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(loadRole).mockResolvedValue("owner");

    await expect(loadAdminCounts()).rejects.toThrow("FORBIDDEN");
    expect(createServiceClient).not.toHaveBeenCalled();
    expect(
      await updateLeadStatus(leadId, "contacted"),
    ).toEqual({ ok: false, formError: "Admins only." });
    expect(createServiceClient).not.toHaveBeenCalled();
  });
});

describe("lead updates", () => {
  function leadClient(data: { id: string }[]) {
    const select = vi.fn().mockResolvedValue({ data, error: null });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({ update }),
    } as unknown as ReturnType<typeof createServiceClient>);
    return { update, eq };
  }

  beforeEach(() => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {} as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: adminId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(loadRole).mockResolvedValue("admin");
  });

  it("writes a status and clears an empty note", async () => {
    const status = leadClient([{ id: leadId }]);
    expect(await updateLeadStatus(leadId, "qualified")).toEqual({ ok: true, success: true });
    expect(status.update).toHaveBeenCalledWith({ status: "qualified" });
    expect(status.eq).toHaveBeenCalledWith("id", leadId);

    const notes = leadClient([{ id: leadId }]);
    expect(await updateLeadNotes(leadId, "   ")).toEqual({ ok: true, success: true });
    expect(notes.update).toHaveBeenCalledWith({ notes: null });
  });

  it("rejects an unknown status and a missing lead", async () => {
    expect(await updateLeadStatus(leadId, "won" as "new")).toEqual({
      ok: false,
      formError: "Pick a lead status.",
    });
    expect(createServiceClient).not.toHaveBeenCalled();

    leadClient([]);
    expect(await updateLeadNotes(leadId, "Called Tuesday.")).toEqual({
      ok: false,
      formError: "That lead is not in the inbox.",
    });
  });
});

describe("requestChanges", () => {
  it("requires a note and emails it through the review path", async () => {
    expect(await requestChanges({ ok: false }, form(""))).toEqual({
      ok: false,
      formError: "Write a note between 1 and 4000 characters.",
    });
    expect(sessionUser).not.toHaveBeenCalled();

    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({ update }),
    } as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {} as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: adminId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(loadRole).mockResolvedValue("admin");
    vi.mocked(loadOwnerListing).mockResolvedValue({
      id: listingId,
      owner_id: adminId,
      title: "Pine ADU",
      slug: "pine-adu",
      status: "pending_review",
      stripe_subscription_id: null,
      renewal_canceled: false,
    } as Awaited<ReturnType<typeof loadOwnerListing>>);
    vi.mocked(loadSetupState).mockResolvedValue({
      photos: [],
      photoCount: 1,
      hasCover: true,
      bedroomCount: 1,
    });

    const result = await requestChanges({ ok: false }, form("Add a cover photo."));
    expect(result).toEqual({ ok: true, success: true });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "changes_requested",
        admin_note: "Add a cover photo.",
        rejection_reason: "Add a cover photo.",
      }),
    );
    expect(deliverReviewDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "changes_requested",
        note: "Add a cover photo.",
        origin: "https://www.furnishedkeys.com",
      }),
    );
    expect(publicOrigin).toHaveBeenCalled();
  });
});

describe("publication", () => {
  function liveListing(status: "approved" | "archived" | "draft") {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({ update }),
    } as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {} as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: adminId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(loadRole).mockResolvedValue("admin");
    vi.mocked(loadOwnerListing).mockResolvedValue({
      id: listingId,
      owner_id: adminId,
      title: "Pine ADU",
      description: "Furnished for a few months.",
      monthly_rent_cents: 180000,
      slug: "pine-adu",
      status,
      reviewed_at: status === "draft" ? null : "2026-10-01T00:00:00.000Z",
      rejection_reason: null,
      stripe_subscription_id: null,
      renewal_canceled: false,
    } as Awaited<ReturnType<typeof loadOwnerListing>>);
    return { update };
  }

  it("archives a live listing without emailing the owner", async () => {
    const { update } = liveListing("approved");
    expect(await unpublishListing(listingId)).toEqual({ ok: true, success: true });
    expect(update).toHaveBeenCalledWith({ status: "archived" });
    expect(deliverReviewDecision).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/rentals/pine-adu");
    expect(revalidatePath).toHaveBeenCalledWith("/rentals");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemap.xml");
  });

  it("refuses to unpublish a listing that is not live", async () => {
    const { update } = liveListing("draft");
    expect(await unpublishListing(listingId)).toEqual({
      ok: false,
      formError: "Only a live listing can be unpublished.",
    });
    expect(update).not.toHaveBeenCalled();
    expect(deliverReviewDecision).not.toHaveBeenCalled();
  });

  it("republishes an archived live listing and stops a non-admin", async () => {
    const { update } = liveListing("archived");
    expect(await republishListing(listingId)).toEqual({ ok: true, success: true });
    expect(update).toHaveBeenCalledWith({ status: "approved" });
    expect(deliverReviewDecision).not.toHaveBeenCalled();

    vi.mocked(loadRole).mockResolvedValue("owner");
    expect(await republishListing(listingId)).toEqual({ ok: false, formError: "Admins only." });
    expect(update).toHaveBeenCalledTimes(1);
    expect(await unpublishListing("not-an-id")).toEqual({ ok: false, formError: "Listing not found" });
  });
});

describe("approveListing", () => {
  it("keeps the submit completeness check", async () => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {} as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: adminId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(loadRole).mockResolvedValue("admin");
    vi.mocked(createServiceClient).mockReturnValue({
      from: () => ({ update: vi.fn() }),
    } as unknown as ReturnType<typeof createServiceClient>);
    vi.mocked(loadOwnerListing).mockResolvedValue({
      id: listingId,
      owner_id: adminId,
      title: "Pine ADU",
      description: null,
      monthly_rent_cents: null,
      min_stay_months: null,
      bathrooms: null,
      slug: null,
      stripe_subscription_id: null,
      renewal_canceled: false,
    } as unknown as Awaited<ReturnType<typeof loadOwnerListing>>);
    vi.mocked(loadSetupState).mockResolvedValue({
      photos: [],
      photoCount: 0,
      hasCover: false,
      bedroomCount: 0,
    });

    expect(await approveListing(listingId)).toEqual({
      ok: false,
      formError: "Listing is incomplete",
    });
    expect(deliverReviewDecision).not.toHaveBeenCalled();
  });
});

function form(note: string) {
  const data = new FormData();
  data.set("listingId", listingId);
  data.set("note", note);
  return data;
}
