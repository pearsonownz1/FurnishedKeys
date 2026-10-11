import Link from "next/link";

export const metadata = {
  title: "Management",
  description:
    "Furnished Keys can handle renters and upkeep, from inquiries and showings to move-in. Book a consultation.",
};

export default function ManagementPage() {
  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <p className="text-xs tracking-[0.14em] text-muted uppercase">For owners</p>
      <h1 className="mt-4 font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-[1.05] font-normal tracking-[-0.8px]">
        Furnished Keys management
      </h1>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
        Hand off the work, from inquiries and showings to move-in. We handle
        renters and upkeep. This page does not quote a management price.
      </p>
      <p className="mt-8">
        <Link
          href="/owners"
          className="inline-block rounded-[2px] bg-pine px-5 py-3.5 font-semibold text-white"
        >
          Request an assessment
        </Link>
      </p>
      <p className="mt-6 text-[15px]">
        <Link href="/signup" className="font-semibold text-pine">
          Or list it yourself
        </Link>
      </p>
    </div>
  );
}
