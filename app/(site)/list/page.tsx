import Link from "next/link";
import { listingFeeAmount, listingFeeCadenceLabel, listingFeePerYear } from "@/lib/pricing";

export const metadata = {
  title: "List your property",
  description:
    "Reach renters looking for a few months, not a few nights. The listing fee is billed yearly. Checkout is not open yet.",
};

export default function ListPage() {
  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
        List your property
      </h1>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
        Reach renters looking for a few months, not a few nights. Your listing,
        messages, and calendar stay with you.
      </p>
      <div className="mt-10 max-w-md border border-line bg-surface px-5 py-5">
        <p className="font-semibold">List it yourself</p>
        <p className="mt-1 text-sm text-muted">
          {listingFeeAmount()} {listingFeeCadenceLabel()} ({listingFeePerYear()}). Billed
          yearly and renews automatically.
        </p>
      </div>
      <p className="mt-8 text-[15px] leading-relaxed text-ink">
        Prefer a free rental assessment first?{" "}
        <Link href="/owners#assessment" className="font-semibold text-pine">
          Tell us about the property
        </Link>
        .
      </p>
    </div>
  );
}
