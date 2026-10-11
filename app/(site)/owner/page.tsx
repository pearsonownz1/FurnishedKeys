import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ListingBoard } from "@/components/owner/listing-board";
import { confirmationBanner, type BoardInquiry, type BoardListing } from "@/lib/owner-board";
import { loadOwnerBoard } from "@/lib/owner-board-load";

export const metadata = {
  title: "Your listings",
  description: "Live, in review, and draft listings for your account.",
};

export default function OwnerPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <OwnerDashboard />
    </Suspense>
  );
}

async function OwnerDashboard() {
  await connection();
  const board = await loadOwnerBoard();

  return (
    <div className="shell py-12 lg:py-16">
      <p className="text-xs tracking-[0.14em] text-muted uppercase">Owner</p>
      <h1 className="mt-3 font-serif text-[clamp(2.75rem,5vw,4.5rem)] leading-none font-normal tracking-[-1px]">
        Your listings
      </h1>
      {board && !board.signedIn ? (
        <p className="mt-6 text-sm text-muted">
          <Link href="/sign-in" className="font-semibold text-pine">
            Sign in
          </Link>{" "}
          to see your listings and inquiries.
        </p>
      ) : (
        <DashboardBody listings={board?.listings ?? []} inquiries={board?.inquiries ?? []} />
      )}
    </div>
  );
}

function DashboardBody({
  listings,
  inquiries,
}: {
  listings: BoardListing[];
  inquiries: BoardInquiry[];
}) {
  const banner = confirmationBanner(listings, new Date());
  return (
    <>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
        Yearly renewal stays on until you turn it off. A listing with renewal off stays live through
        the date already paid.
      </p>
      {banner ? <p className="mt-6 max-w-3xl bg-pine-l px-4 py-3 text-sm text-pine-d">{banner}</p> : null}
      <div className="mt-8">
        <ListingBoard listings={listings} inquiries={inquiries} />
      </div>
    </>
  );
}
