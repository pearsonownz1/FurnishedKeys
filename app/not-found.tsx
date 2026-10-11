import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="content" className="shell flex-1 py-20">
        <h1 className="font-serif text-5xl font-normal tracking-tight">
          That page is not here
        </h1>
        <p className="mt-4 text-muted">
          <Link href="/" className="font-semibold text-pine">
            Back home
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
