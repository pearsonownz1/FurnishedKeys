import Link from "next/link";

export const metadata = {
  title: "Sign in",
  description: "Accounts are not open yet.",
};

export default function SignInPage() {
  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
        Sign in
      </h1>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
        Accounts are not open yet. You can still browse furnished homes.
      </p>
      <p className="mt-8">
        <Link href="/rentals" className="font-semibold text-pine">
          Find a home
        </Link>
      </p>
    </div>
  );
}
