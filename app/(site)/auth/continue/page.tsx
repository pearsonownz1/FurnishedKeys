import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { readOtpLink } from "@/lib/auth-confirm";

export const metadata = {
  title: "Continue",
  description: "Finish opening the link from your email.",
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;

export default function ContinuePage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Continue searchParams={searchParams} />
    </Suspense>
  );
}

async function Continue({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const link = readOtpLink((key) => {
    const value = params[key];
    return typeof value === "string" ? value : null;
  });

  const heading =
    link?.type === "recovery" ? "Reset your password" : "Confirm your email";

  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <div className="max-w-md">
        <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
          {link ? heading : "That link didn't work"}
        </h1>
        {link ? (
          <form method="post" action="/auth/confirm" className="mt-6">
            <input type="hidden" name="token_hash" value={link.tokenHash} />
            <input type="hidden" name="type" value={link.type} />
            <input type="hidden" name="next" value={link.next} />
            <p className="text-[17px] leading-relaxed text-muted">
              {link.type === "recovery"
                ? "Continue to choose a new password."
                : "Continue to finish signing in."}
            </p>
            <button
              type="submit"
              className="mt-6 rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white"
            >
              Continue
            </button>
          </form>
        ) : (
          <p className="mt-6 text-sm">
            <Link href="/forgot-password" className="font-semibold text-pine">
              Request a new link
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
