import Image from "next/image";
import Link from "next/link";

export function BrandLockup({
  href = "/",
  className = "",
  mark,
  onDark = false,
  priority = false,
}: {
  href?: string | null;
  className?: string;
  mark?: string;
  onDark?: boolean;
  priority?: boolean;
}) {
  const classes = `inline-flex items-center gap-2.5 font-serif leading-none tracking-[-0.3px] ${className}`;
  const body = (
    <>
      <span
        className={`inline-flex size-[1cap] shrink-0 overflow-hidden rounded-[2px] ${
          onDark ? "shadow-[0_0_0_1px_rgba(250,248,244,0.9)]" : ""
        }`}
      >
        <Image
          src="/brand/fk-icon.svg"
          alt=""
          width={32}
          height={32}
          unoptimized
          priority={priority}
          className="size-full"
        />
      </span>
      <span className="whitespace-nowrap">
        Furnished <span className="italic">Keys</span>
      </span>
      {mark ? (
        <span className="bg-ink px-[7px] py-[3px] text-[10px] font-semibold tracking-[0.08em] text-white">
          {mark}
        </span>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  return <span className={classes}>{body}</span>;
}
