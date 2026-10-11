import { describe, expect, it } from "vitest";
import {
  feeCoversListing,
  missingSubmitFields,
  normalizeSource,
  requireAdmin,
  requireEditableListing,
  requireOwner,
} from "./access";
import {
  commitListingFeeEvent,
  planListingFeeEvent,
  type FeeSnapshot,
  type FeeStore,
  type ListingFeeEvent,
} from "./fee-events";

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

function listing(partial: Partial<FeeSnapshot> = {}): FeeSnapshot {
  return {
    id: "listing-1",
    owner_id: ownerId,
    listing_fee_status: "unpaid",
    fee_paid_through: null,
    paid_at: null,
    stripe_subscription_id: null,
    renewal_canceled: false,
    ...partial,
  };
}

function memoryStore(initial: FeeSnapshot): FeeStore & {
  saved: FeeSnapshot[];
  events: string[];
} {
  const events = new Set<string>();
  const saved: FeeSnapshot[] = [];
  let current = initial;
  return {
    events: [] as string[],
    saved,
    async claim(claim) {
      if (events.has(claim.eventId)) return false;
      events.add(claim.eventId);
      this.events.push(claim.eventId);
      return true;
    },
    async save(listingId, patch) {
      current = { ...current, id: listingId, ...patch };
      saved.push({ ...current });
    },
  };
}

describe("listing permissions", () => {
  it("lets the owner edit a draft, a rejection, or a changes request", () => {
    for (const status of ["draft", "rejected", "changes_requested"] as const) {
      expect(requireEditableListing(ownerId, { owner_id: ownerId, status }).ok).toBe(true);
    }
  });

  it("blocks signed-out users, other accounts, and listings that are not editable", () => {
    expect(requireOwner(null, ownerId)).toMatchObject({ ok: false, status: 401 });
    expect(requireOwner(otherId, ownerId)).toMatchObject({ ok: false, status: 403 });
    expect(requireEditableListing(ownerId, { owner_id: ownerId, status: "approved" })).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(
      requireEditableListing(ownerId, { owner_id: ownerId, status: "pending_review" }),
    ).toMatchObject({ ok: false, status: 409 });
    expect(requireAdmin(ownerId, "owner")).toMatchObject({ ok: false, status: 403 });
    expect(requireAdmin(null, "admin")).toMatchObject({ ok: false, status: 401 });
    expect(requireAdmin(ownerId, "admin").ok).toBe(true);
  });
});

describe("submit completeness and coverage", () => {
  const complete = {
    title: "Northwest ADU",
    description: "Furnished for a few months.",
    monthly_rent_cents: 199_000,
    min_stay_months: 1,
    bedroomCount: 1,
    bathrooms: 1,
    photoCount: 1,
    hasCover: true,
  };

  it("lists every missing field", () => {
    expect(
      missingSubmitFields({
        title: "  ",
        description: null,
        monthly_rent_cents: 0,
        min_stay_months: 0,
        bedroomCount: 0,
        bathrooms: null,
        photoCount: 0,
        hasCover: false,
      }),
    ).toEqual([
      "title",
      "description",
      "rent",
      "min_stay",
      "bedroom",
      "bathrooms",
      "photo",
      "cover",
    ]);
  });

  it("accepts a complete listing", () => {
    expect(missingSubmitFields(complete)).toEqual([]);
  });

  it("treats a waived fee or an unexpired paid period as covered", () => {
    const now = new Date("2026-10-11T00:00:00.000Z");
    expect(feeCoversListing({ listing_fee_status: "waived", fee_paid_through: null }, now)).toBe(
      true,
    );
    expect(
      feeCoversListing(
        { listing_fee_status: "paid", fee_paid_through: "2027-10-11T00:00:00.000Z" },
        now,
      ),
    ).toBe(true);
    expect(
      feeCoversListing(
        { listing_fee_status: "paid", fee_paid_through: "2026-10-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(feeCoversListing({ listing_fee_status: "unpaid", fee_paid_through: null }, now)).toBe(
      false,
    );
  });

  it("keeps source slugs in the owner-lead format and defaults to web", () => {
    expect(normalizeSource(undefined)).toBe("web");
    expect(normalizeSource(" letter ")).toBe("letter");
    expect(normalizeSource("Mailer")).toBeNull();
  });
});

describe("listing fee webhook", () => {
  const periodEnd = "2027-10-11T00:00:00.000Z";
  const paidAt = "2026-10-11T12:00:00.000Z";

  function checkout(
    autoRenew: boolean,
  ): Extract<ListingFeeEvent, { type: "checkout.session.completed" }> {
    return {
      id: "evt_checkout",
      type: "checkout.session.completed",
      listingId: "listing-1",
      ownerId,
      sessionId: "cs_1",
      subscriptionId: "sub_1",
      periodEnd,
      amountCents: 19900,
      autoRenew,
      paidAt,
    };
  }

  it("marks the fee paid without sending the stub to review, and cancels renewal when asked", () => {
    const plan = planListingFeeEvent(listing(), checkout(false));
    expect(plan?.patch).toMatchObject({
      listing_fee_status: "paid",
      fee_paid_through: periodEnd,
      paid_at: paidAt,
      stripe_subscription_id: "sub_1",
      renewal_canceled: true,
    });
    expect(plan?.patch).not.toHaveProperty("status");
  });

  it("applies a checkout event once and ignores the replay", async () => {
    const store = memoryStore(listing());
    const current = listing();
    const first = await commitListingFeeEvent(store, current, checkout(true));
    const after = store.saved[0];
    const second = await commitListingFeeEvent(store, after ?? current, checkout(true));

    expect(first).toBe("applied");
    expect(second).toBe("duplicate");
    expect(store.events).toEqual(["evt_checkout"]);
    expect(store.saved).toHaveLength(1);
    expect(store.saved[0]?.renewal_canceled).toBe(false);
  });

  it("extends paid_through on invoice.paid and does not drop an approved listing back to review", () => {
    const plan = planListingFeeEvent(
      listing({
        listing_fee_status: "paid",
        fee_paid_through: periodEnd,
        stripe_subscription_id: "sub_1",
        paid_at: paidAt,
      }),
      {
        id: "evt_invoice",
        type: "invoice.paid",
        subscriptionId: "sub_1",
        invoiceId: "in_2",
        periodEnd: "2028-10-11T00:00:00.000Z",
        amountCents: 19900,
        paidAt: "2027-10-11T00:00:00.000Z",
      },
    );
    expect(plan?.patch.fee_paid_through).toBe("2028-10-11T00:00:00.000Z");
    expect(plan?.patch.listing_fee_status).toBe("paid");
    expect(plan?.patch).not.toHaveProperty("status");
  });

  it("leaves a covered listing paid when a renewal invoice fails, then marks it unpaid after the period", () => {
    const covered = planListingFeeEvent(
      listing({
        listing_fee_status: "paid",
        fee_paid_through: periodEnd,
        stripe_subscription_id: "sub_1",
      }),
      {
        id: "evt_fail_early",
        type: "invoice.payment_failed",
        subscriptionId: "sub_1",
        invoiceId: "in_fail",
        periodEnd,
        now: "2027-01-01T00:00:00.000Z",
      },
    );
    expect(covered?.updateListing).toBe(false);
    expect(covered?.patch.listing_fee_status).toBe("paid");

    const expired = planListingFeeEvent(
      listing({
        listing_fee_status: "paid",
        fee_paid_through: periodEnd,
        stripe_subscription_id: "sub_1",
      }),
      {
        id: "evt_fail_late",
        type: "invoice.payment_failed",
        subscriptionId: "sub_1",
        invoiceId: "in_fail_2",
        periodEnd,
        now: "2027-10-12T00:00:00.000Z",
      },
    );
    expect(expired?.updateListing).toBe(true);
    expect(expired?.patch.listing_fee_status).toBe("unpaid");
  });

  it("marks the fee unpaid when the subscription is deleted", () => {
    const plan = planListingFeeEvent(
      listing({
        listing_fee_status: "paid",
        fee_paid_through: periodEnd,
        stripe_subscription_id: "sub_1",
        renewal_canceled: true,
      }),
      { id: "evt_deleted", type: "customer.subscription.deleted", subscriptionId: "sub_1" },
    );
    expect(plan?.patch.listing_fee_status).toBe("unpaid");
    expect(plan?.patch.renewal_canceled).toBe(false);
  });

  it("ignores a checkout event for a different owner", () => {
    expect(
      planListingFeeEvent(listing(), {
        ...checkout(true),
        ownerId: otherId,
      }),
    ).toBeNull();
  });
});
