import Image from "next/image";
import { coverImageAlt, coverImageSrc } from "@/lib/photos";

export function CoverImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={coverImageSrc(src)}
      alt={coverImageAlt(src, alt)}
      fill
      unoptimized
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
