"use client";

import { CoverImage } from "@/components/cover-image";
import { useRef } from "react";

export type GalleryPhoto = {
  src: string | null;
  alt: string;
};

export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frames = photos.length > 0 ? photos : [{ src: null, alt: "Photo coming soon" }];
  const count = frames.length;
  const featured = frames[0];
  const thumbs = frames.slice(1, 5);
  const single = count === 1;

  if (!featured) {
    return null;
  }

  return (
    <>
      <div
        className={
          single
            ? "relative"
            : "relative grid grid-cols-1 gap-2 md:h-[440px] md:grid-cols-4 md:grid-rows-2"
        }
      >
        <PhotoTile photo={featured} large priority full={single} />
        {single
          ? null
          : thumbs.map((photo, index) => (
              <PhotoTile key={`${photo.alt}-${index}`} photo={photo} />
            ))}
        {count > 1 ? (
          <button
            type="button"
            className="absolute right-3 bottom-3 rounded-[2px] bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink"
            onClick={() => dialogRef.current?.showModal()}
          >
            Show all photos ({count})
          </button>
        ) : null}
      </div>
      {count > 1 ? (
        <dialog
          ref={dialogRef}
          className="w-[min(960px,calc(100%-2rem))] bg-bg p-4 text-ink backdrop:bg-ink/40"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Show all photos ({count})</p>
            <button
              type="button"
              className="rounded-[2px] border border-line px-3 py-1.5 text-sm"
              onClick={() => dialogRef.current?.close()}
            >
              Close
            </button>
          </div>
          <div className="grid gap-3">
            {frames.map((photo, index) => (
              <PhotoTile key={`${photo.alt}-full-${index}`} photo={photo} large full />
            ))}
          </div>
        </dialog>
      ) : null}
    </>
  );
}

function PhotoTile({
  photo,
  large = false,
  priority = false,
  full = false,
}: {
  photo: GalleryPhoto;
  large?: boolean;
  priority?: boolean;
  full?: boolean;
}) {
  const frame = full
    ? "relative h-[240px] w-full md:h-[440px]"
    : large
      ? "relative min-h-[220px] md:col-span-2 md:row-span-2 md:min-h-0"
      : "relative min-h-[120px] md:min-h-0";

  return (
    <div className={`overflow-hidden bg-stone ${frame}`}>
      <CoverImage
        src={photo.src}
        alt={photo.alt}
        priority={priority}
        sizes={large || full ? "(min-width: 1024px) 960px, 100vw" : "240px"}
      />
    </div>
  );
}
