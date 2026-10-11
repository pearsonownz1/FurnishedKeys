import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/listings/[id]/checkout/route";
import { GET } from "@/app/api/listings/[id]/checkout/status/route";
import { loadOwnerListing, sessionUser } from "@/lib/api/owner-listing";
import { getStripe, paymentsConfigured } from "@/lib/stripe/config";
import { createServiceClient } from "@/lib/supabase/service";
import {
  feeAlreadyRecorded,
  oneYearFrom,
  recordPlaceholderWaiver,
  WAIVED_NO_STRIPE_STATUS,
  type PlaceholderListing,
} from "./placeholder-fee";

vi.mock("@/lib/api/owner-listing", () => ({
  sessionUser: vi.fn(),
  loadOwnerListing: vi.fn(),
}));

vi.mock("@/lib/stripe/config", async () => {
  const actual = await vi.importActual<typeof import("@/lib/stripe/config")>("@/lib/stripe/config");
  return {
    ...actual,
    paymentsConfigured: vi.fn(),
    getStripe: vi.fn(),
  };
});

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

const ownerId = "11111111-1111-4111-8111-111111111111";
const listingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function listing(partial: Partial<PlaceholderListing> = {}): PlaceholderListing & { owner_id: string } {
  return {
    id: listingId,
    owner_id: ownerId,
    listing_fee_status: "unpaid",
    fee_paid_through: null,
    paid_at: null,
    stripe_subscription_id: null,
    renewal_canceled: false,
    ...partial,
  };
}

function checkoutRequest() {
  return new Request(`https://furnishedkeys.com/api/listings/${listingId}/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ auto_renew: true }),
  });
}

const context = { params: Promise.resolve({ id: listingId }) };

beforeEach(() => {
  vi.mocked(sessionUser).mockReset();
  vi.mocked(loadOwnerListing).mockReset();
  vi.mocked(paymentsConfigured).mockReset();
  vi.mocked(getStripe).mockReset();
  vi.mocked(createServiceClient).mockReset();
  vi.mocked(sessionUser).mockResolvedValue({
    supabase: {} as Awaited<ReturnType<typeof sessionUser>>["supabase"],
    user: { id: ownerId, email: "owner@example.com" } as NonNullable<
      Awaited<ReturnType<typeof sessionUser>>["user"]
    >,
  });
  vi.mocked(loadOwnerListing).mockResolvedValue(listing() as Awaited<ReturnType<typeof loadOwnerListing>>);
});

describe("placeholder waiver", () => {
  it("adds one calendar year", () => {
    expect(oneYearFrom(new Date("2026-10-11T05:04:00.000Z"))).toBe("2027-10-11T05:04:00.000Z");
    expect(feeAlreadyRecorded("paid")).toBe(true);
    expect(feeAlreadyRecorded("waived")).toBe(true);
    expect(feeAlreadyRecorded("unpaid")).toBe(false);
  });

  it("writes a waived_no_stripe ledger row and does not write again once covered", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const service = { rpc, from: vi.fn() } as unknown as NonNullable<
      ReturnType<typeof createServiceClient>
    >;
    const now = new Date("2026-10-11T05:04:00.000Z");
    const unpaid = listing();

    const first = await recordPlaceholderWaiver(service, unpaid, now);
    expect(first).toEqual({ waived: true, paid_through: "2027-10-11T05:04:00.000Z" });
    expect(rpc).toHaveBeenCalledWith("apply_listing_fee_event", {
      event_id: `waived_no_stripe:${listingId}`,
      target_listing: listingId,
      session_id: null,
      invoice_id: null,
      subscription_id: null,
      amount_cents: 0,
      payment_status: WAIVED_NO_STRIPE_STATUS,
      period_end: "2027-10-11T05:04:00.000Z",
      update_listing: true,
      next_fee_status: "waived",
      next_paid_through: "2027-10-11T05:04:00.000Z",
      next_paid_at: null,
      next_subscription_id: null,
      next_renewal_canceled: false,
    });

    const again = await recordPlaceholderWaiver(
      service,
      listing({
        listing_fee_status: "waived",
        fee_paid_through: "2027-10-11T05:04:00.000Z",
      }),
      now,
    );
    expect(again).toEqual({ waived: true, paid_through: "2027-10-11T05:04:00.000Z" });
    expect(rpc).toHaveBeenCalledTimes(1);

    const paid = await recordPlaceholderWaiver(
      service,
      listing({
        listing_fee_status: "paid",
        fee_paid_through: "2028-01-01T00:00:00.000Z",
      }),
      now,
    );
    expect(paid).toEqual({ waived: true, paid_through: "2028-01-01T00:00:00.000Z" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/listings/[id]/checkout", () => {
  it("waives for one year when Stripe is not configured", async () => {
    vi.mocked(paymentsConfigured).mockReturnValue(false);
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    vi.mocked(createServiceClient).mockReturnValue({ rpc } as unknown as ReturnType<
      typeof createServiceClient
    >);

    const response = await POST(checkoutRequest(), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.waived).toBe(true);
    expect(body.paid_through).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const paidThrough = new Date(body.paid_through).getTime();
    expect(paidThrough).toBeGreaterThan(Date.now());
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc.mock.calls[0][1].payment_status).toBe("waived_no_stripe");
    expect(rpc.mock.calls[0][1].next_fee_status).toBe("waived");
    expect(getStripe).not.toHaveBeenCalled();
  });

  it("returns the stored coverage without writing when the fee is already waived or paid", async () => {
    vi.mocked(paymentsConfigured).mockReturnValue(false);
    vi.mocked(loadOwnerListing).mockResolvedValue(
      listing({
        listing_fee_status: "waived",
        fee_paid_through: "2027-10-11T05:04:00.000Z",
      }) as Awaited<ReturnType<typeof loadOwnerListing>>,
    );

    const waived = await POST(checkoutRequest(), context);
    expect(waived.status).toBe(200);
    expect(await waived.json()).toEqual({
      waived: true,
      paid_through: "2027-10-11T05:04:00.000Z",
    });

    vi.mocked(loadOwnerListing).mockResolvedValue(
      listing({
        listing_fee_status: "paid",
        fee_paid_through: "2028-04-01T00:00:00.000Z",
      }) as Awaited<ReturnType<typeof loadOwnerListing>>,
    );
    const paid = await POST(checkoutRequest(), context);
    expect(await paid.json()).toEqual({
      waived: true,
      paid_through: "2028-04-01T00:00:00.000Z",
    });
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("returns a client secret and does not waive when Stripe is configured", async () => {
    vi.mocked(paymentsConfigured).mockReturnValue(true);
    const create = vi.fn().mockResolvedValue({ client_secret: "cs_test_embedded" });
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { create } },
    } as unknown as ReturnType<typeof getStripe>);

    const response = await POST(checkoutRequest(), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ client_secret: "cs_test_embedded" });
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].ui_mode).toBe("embedded_page");
    expect(create.mock.calls[0][0].mode).toBe("subscription");
    expect(create.mock.calls[0][0]).not.toHaveProperty("branding_settings");
    expect(create.mock.calls[0][0]).not.toHaveProperty("appearance");
    expect(createServiceClient).not.toHaveBeenCalled();
  });
});

describe("GET /api/listings/[id]/checkout/status", () => {
  it("returns waived coverage without a Stripe session", async () => {
    vi.mocked(loadOwnerListing).mockResolvedValue(
      listing({
        listing_fee_status: "waived",
        fee_paid_through: "2027-10-11T05:04:00.000Z",
      }) as Awaited<ReturnType<typeof loadOwnerListing>>,
    );

    const response = await GET(
      new Request(`https://furnishedkeys.com/api/listings/${listingId}/checkout/status`),
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "waived",
      paid_through: "2027-10-11T05:04:00.000Z",
    });
    expect(getStripe).not.toHaveBeenCalled();
  });

  it("still reads the Stripe session when the fee is not waived", async () => {
    const retrieve = vi.fn().mockResolvedValue({
      payment_status: "paid",
      status: "complete",
      metadata: { listing_id: listingId },
      subscription: null,
    });
    vi.mocked(getStripe).mockReturnValue({
      checkout: { sessions: { retrieve } },
    } as unknown as ReturnType<typeof getStripe>);

    const response = await GET(
      new Request(
        `https://furnishedkeys.com/api/listings/${listingId}/checkout/status?session_id=cs_test`,
      ),
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "paid", paid_through: null });
    expect(retrieve).toHaveBeenCalledWith("cs_test");
  });
});
