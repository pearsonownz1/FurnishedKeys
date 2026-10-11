import { beforeEach, describe, expect, it, vi } from "vitest";
import { replyToInquiry } from "@/app/(site)/owner/actions";
import { sessionUser } from "@/lib/api/owner-listing";
import { deliverInquiryReply } from "@/lib/email";

vi.mock("@/lib/api/owner-listing", () => ({
  sessionUser: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  deliverInquiryReply: vi.fn(),
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

function client() {
  const messageInsert = vi.fn().mockResolvedValue({ error: null });
  const statusEq = vi.fn().mockResolvedValue({ error: null });
  const statusUpdate = vi.fn().mockReturnValue({ eq: statusEq });
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

  return { supabase, messageInsert, statusUpdate, statusEq };
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
      body: "Yes, those dates work.",
    });
    expect(db.statusUpdate).toHaveBeenCalledWith({ status: "responded" });
    expect(db.statusEq).toHaveBeenCalledWith("id", inquiryId);
    expect(deliverInquiryReply).toHaveBeenCalledWith({
      to: "delivered+renter@resend.dev",
      listingTitle: "Pine ADU",
      body: "Yes, those dates work.",
      replyTo: "delivered+owner@resend.dev",
    });
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
    expect(logged).toHaveBeenCalledWith("inquiry reply email failed", "resend down");
    logged.mockRestore();
  });

  it("does not email when the message insert fails", async () => {
    const db = client();
    db.messageInsert.mockResolvedValue({ error: { message: "denied", code: "42501" } });
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
});
