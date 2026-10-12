import Image from "next/image";
import { BrandLockup } from "@/components/brand-lockup";
import { sourceName, type Cover } from "@/lib/content/cover";
import { externalLinkRel } from "@/lib/content/text";

function CreditLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel={externalLinkRel(href) ?? undefined} className="font-semibold text-pine">
      {children}
    </a>
  );
}

export function ContentCover({
  cover,
  sizes,
  priority = false,
  bordered = false,
  padCaption = false,
}: {
  cover: Cover | null;
  sizes: string;
  priority?: boolean;
  bordered?: boolean;
  padCaption?: boolean;
}) {
  const showCredit = Boolean(cover && (cover.photographer || cover.license || cover.sourceUrl));
  return (
    <figure>
      <div className={`relative aspect-video overflow-hidden bg-stone ${bordered ? "border border-line" : ""}`}>
        {cover ? (
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            sizes={sizes}
            className="object-cover"
            {...(priority ? { priority: true } : { loading: "lazy" as const })}
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 flex flex-col bg-surface">
            <div className="h-1.5 bg-pine" />
            <div className="flex flex-1 items-end p-5 sm:p-6">
              <BrandLockup href={null} className="text-2xl text-ink" />
            </div>
          </div>
        )}
      </div>
      {showCredit && cover ? (
        <figcaption className={`text-xs leading-relaxed text-muted ${padCaption ? "px-6 pt-3" : "mt-2"}`}>
          Photo: {cover.photographer}
          {cover.license ? (
            <>
              ,{" "}
              {cover.licenseUrl ? <CreditLink href={cover.licenseUrl}>{cover.license}</CreditLink> : cover.license}
            </>
          ) : null}
          {cover.sourceUrl ? (
            <>
              , via <CreditLink href={cover.sourceUrl}>{sourceName(cover.sourceUrl)}</CreditLink>
            </>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
