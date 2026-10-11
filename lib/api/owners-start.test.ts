import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/owners/start/route";
import { sessionUser } from "@/lib/api/owner-listing";
import { createServiceClient } from "@/lib/supabase/service";

vi.mock("@/lib/api/owner-listing", () => ({
  sessionUser: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

const locationId = "c3a1e0b2-4d5f-4a6b-8c7d-111111111101";
const userId = "22222222-2222-4222-8222-222222222222";
const listingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SIGN_IN_HINT =
  "An account with this email already exists. Sign in, or use Forgot password.";
const password = "correct-horse";

function chain(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    then: (
      resolve: (value: { data: unknown; error: unknown }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  return builder;
}

function startRequest(extra: Record<string, unknown> = { password }) {
  return new Request("https://furnishedkeys.com/api/owners/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      full_name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "5415550100",
      property_type: "apartment",
      location_id: locationId,
      ...extra,
    }),
  });
}

function serviceClient(createUser: ReturnType<typeof vi.fn>) {
  const from = vi.fn((table: string) => {
    if (table === "locations") return chain({ data: { id: locationId }, error: null });
    if (table === "profiles") return chain({ data: null, error: null });
    return chain({ data: { id: listingId }, error: null });
  });
  return { auth: { admin: { createUser } }, from };
}

beforeEach(() => {
  vi.mocked(sessionUser).mockReset();
  vi.mocked(createServiceClient).mockReset();
});

describe("POST /api/owners/start", () => {
  it("creates a confirmed user and signs them in when there is no session", async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: { access_token: "session" } },
      error: null,
    });
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: { auth: { signInWithPassword } } as unknown as Awaited<
        ReturnType<typeof sessionUser>
      >["supabase"],
      user: null,
    });
    vi.mocked(createServiceClient).mockReturnValue(
      serviceClient(createUser) as unknown as ReturnType<typeof createServiceClient>,
    );

    const response = await POST(startRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ listing_id: listingId });
    expect(createUser).toHaveBeenCalledOnce();
    const created = createUser.mock.calls[0]?.[0] as {
      email: string;
      password: string;
      email_confirm: boolean;
      user_metadata: { full_name: string };
    };
    expect(created.email).toBe("ada@example.com");
    expect(created.email_confirm).toBe(true);
    expect(created.user_metadata).toEqual({ full_name: "Ada Lovelace" });
    expect(created.password).toBe(password);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "ada@example.com",
      password,
    });
    expect(JSON.stringify(body)).not.toContain(created.password);
  });

  it("returns 401 when the email already has an account", async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: {
        message: "A user with this email address has already been registered",
        code: "email_exists",
      },
    });
    const signInWithPassword = vi.fn();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: { auth: { signInWithPassword } } as unknown as Awaited<
        ReturnType<typeof sessionUser>
      >["supabase"],
      user: null,
    });
    vi.mocked(createServiceClient).mockReturnValue(
      serviceClient(createUser) as unknown as ReturnType<typeof createServiceClient>,
    );

    const response = await POST(startRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Sign in required", hint: SIGN_IN_HINT });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns 422 when a new account has no password", async () => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: { auth: { signInWithPassword: vi.fn() } } as unknown as Awaited<
        ReturnType<typeof sessionUser>
      >["supabase"],
      user: null,
    });
    vi.mocked(createServiceClient).mockReturnValue(
      serviceClient(vi.fn()) as unknown as ReturnType<typeof createServiceClient>,
    );

    const response = await POST(startRequest({}));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Password must be at least 8 characters" });
  });

  it("returns 422 when a new password is shorter than 8 characters", async () => {
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: { auth: { signInWithPassword: vi.fn() } } as unknown as Awaited<
        ReturnType<typeof sessionUser>
      >["supabase"],
      user: null,
    });
    vi.mocked(createServiceClient).mockReturnValue(
      serviceClient(vi.fn()) as unknown as ReturnType<typeof createServiceClient>,
    );

    const response = await POST(startRequest({ password: "short" }));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Password must be at least 8 characters" });
  });

  it("ignores password when a session already exists", async () => {
    const createUser = vi.fn();
    const signInWithPassword = vi.fn();
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: { auth: { signInWithPassword } } as unknown as Awaited<
        ReturnType<typeof sessionUser>
      >["supabase"],
      user: { id: userId, email: "ada@example.com" } as NonNullable<
        Awaited<ReturnType<typeof sessionUser>>["user"]
      >,
    });
    vi.mocked(createServiceClient).mockReturnValue(
      serviceClient(createUser) as unknown as ReturnType<typeof createServiceClient>,
    );

    const response = await POST(startRequest({}));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ listing_id: listingId });
    expect(createUser).not.toHaveBeenCalled();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
