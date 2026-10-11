"use client";

import Image from "next/image";
import { useRef } from "react";

export type GalleryPhoto = {
  src: string | null;
  alt: string;
};

export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const count = photos.length;
  const featured = photos[0];
  const thumbs = photos.slice(1, 5);

  if (!featured) {
    return <div className="min-h-[220px] bg-stone" />;
  }

  return (
    <>
      <div className="relative grid grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2 md:h-[440px]">
        <PhotoTile photo={featured} large priority />
        {thumbs.map((photo, index) => (
          <PhotoTile key={`${photo.alt}-${index}`} photo={photo} />
        ))}
        {count > 0 ? (
          <button
            type="button"
            className="absolute right-3 bottom-3 rounded-[2px] bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink"
            onClick={() => dialogRef.current?.showModal()}
          >
            Show all photos ({count})
          </button>
        ) : null}
      </div>
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
          {photos.map((photo, index) => (
            <PhotoTile key={`${photo.alt}-full-${index}`} photo={photo} large />
          ))}
        </div>
      </dialog>
    </>
  );
}

function PhotoTile({
  photo,
  large = false,
  priority = false,
}: {
  photo: GalleryPhoto;
  large?: boolean;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-stone ${
        large ? "min-h-[220px] md:col-span-2 md:row-span-2 md:min-h-0" : "min-h-[120px] md:min-h-0"
      }`}
    >
      {photo.src ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          priority={priority}
          unoptimized
          sizes={large ? "(min-width: 1024px) 720px, 100vw" : "240px"}
          className="object-cover"
        />
      ) : (
        <p className="absolute inset-0 grid place-items-center text-sm text-muted">Photo unavailable</p>
      )}
    </div>
  );
}
