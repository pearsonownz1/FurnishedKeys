import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { POST as review } from "@/app/api/admin/listings/[id]/review/route";
import { POST as submit } from "@/app/api/listings/[id]/submit/route";
import { loadOwnerListing, loadRole, loadSetupState, sessionUser } from "@/lib/api/owner-listing";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api/owner-listing", () => ({
  sessionUser: vi.fn(),
  loadOwnerListing: vi.fn(),
  loadSetupState: vi.fn(),
  loadRole: vi.fn(),
}));

const ownerId = "11111111-1111-4111-8111-111111111111";
const listingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function listing() {
  return {
    id: listingId,
    owner_id: ownerId,
    status: "draft" as const,
    title: "Pine ADU",
    description: "A furnished ADU in Bend.",
    monthly_rent_cents: 250_000,
    min_stay_months: 1,
    bathrooms: 1,
    slug: null,
    listing_fee_status: "unpaid" as const,
    fee_paid_through: null,
    stripe_subscription_id: null,
    renewal_canceled: false,
  };
}

function supabase() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  return {
    client: { from: vi.fn().mockReturnValue({ update }) },
    update,
    eq,
  };
}

const context = { params: Promise.resolve({ id: listingId }) };

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
  vi.mocked(sessionUser).mockReset();
  vi.mocked(loadOwnerListing).mockReset();
  vi.mocked(loadSetupState).mockReset();
  vi.mocked(loadRole).mockReset();
});

describe("free listing visibility", () => {
  it("keeps fee columns and stops using them for public visibility", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/20261011075114_listing_free.sql", import.meta.url),
      "utf8",
    );
    const visibility = sql.slice(sql.indexOf("create or replace function private.listing_is_public"));
    expect(visibility).toContain("status = 'approved'");
    expect(visibility).not.toContain("listing_fee_status");
    expect(visibility).not.toContain("fee_paid_through");
    const constraint = sql.slice(
      sql.indexOf("add constraint listings_approved_complete"),
      sql.indexOf("comment on column"),
    );
    expect(constraint).toContain("monthly_rent_cents > 0");
    expect(constraint).not.toContain("listing_fee_status");
    expect(sql).not.toMatch(/drop table/i);
    expect(sql).not.toMatch(/drop column/i);
  });
});

describe("POST /api/listings/[id]/submit", () => {
  it("submits an unpaid complete listing", async () => {
    const db = supabase();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: db.client as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(loadOwnerListing).mockResolvedValue(
      listing() as Awaited<ReturnType<typeof loadOwnerListing>>,
    );
    vi.mocked(loadSetupState).mockResolvedValue({
      photos: [{ id: "photo-1", is_cover: true, sort: 0 }],
      photoCount: 1,
      hasCover: true,
      bedroomCount: 1,
    });

    const response = await submit(new Request("https://furnishedkeys.com/api/listings/x/submit"), context);

    expect(response.status).toBe(200);
    expect(db.update).toHaveBeenCalledWith({
      status: "pending_review",
      slug: expect.stringMatching(/^pine-adu-[a-f0-9]{8}$/),
    });
    const slug = db.update.mock.calls[0]?.[0].slug as string;
    expect(revalidatePath).toHaveBeenCalledWith(`/rentals/${slug}`);
    expect(revalidatePath).toHaveBeenCalledWith("/rentals");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    const body = await response.json();
    expect(body.listing.listing_fee_status).toBe("unpaid");
  });

  it("still returns the completeness list", async () => {
    const db = supabase();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: db.client as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(loadOwnerListing).mockResolvedValue(
      listing() as Awaited<ReturnType<typeof loadOwnerListing>>,
    );
    vi.mocked(loadSetupState).mockResolvedValue({
      photos: [],
      photoCount: 0,
      hasCover: false,
      bedroomCount: 0,
    });

    const response = await submit(new Request("https://furnishedkeys.com/api/listings/x/submit"), context);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "Listing is incomplete",
      missing: ["bedroom", "photo", "cover"],
    });
    expect(db.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/listings/[id]/review", () => {
  it("approves an unpaid complete listing", async () => {
    const db = supabase();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: db.client as unknown as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: ownerId } as NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>,
    });
    vi.mocked(loadRole).mockResolvedValue("admin");
    vi.mocked(loadOwnerListing).mockResolvedValue({
      ...listing(),
      status: "pending_review",
      slug: "pine-adu",
    } as Awaited<ReturnType<typeof loadOwnerListing>>);
    vi.mocked(loadSetupState).mockResolvedValue({
      photos: [{ id: "photo-1", is_cover: true, sort: 0 }],
      photoCount: 1,
      hasCover: true,
      bedroomCount: 1,
    });

    const response = await review(
      new Request("https://furnishedkeys.com/api/admin/listings/x/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(db.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", rejection_reason: null }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/rentals/pine-adu");
    expect(revalidatePath).toHaveBeenCalledWith("/rentals");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    const body = await response.json();
    expect(body.listing.listing_fee_status).toBe("unpaid");
  });
});
