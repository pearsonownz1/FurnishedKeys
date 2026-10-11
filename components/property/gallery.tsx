"use client";

import Image from "next/image";
import { useRef } from "react";

export type GalleryPhoto = {
  src: string | null;
  alt: string;
};

export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const visible = photos.slice(0, 3);
  const count = photos.length;

  return (
    <>
      <div
        className={
          visible.length >= 3
            ? "grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr] sm:grid-rows-2 sm:h-[408px]"
            : "grid grid-cols-1 gap-2"
        }
      >
        {visible.map((photo, index) => (
          <div
            key={`${photo.alt}-${index}`}
            className={`relative overflow-hidden rounded-[2px] bg-stone ${
              visible.length >= 3 && index === 0
                ? "min-h-[220px] sm:row-span-2 sm:min-h-0"
                : "min-h-[160px] sm:min-h-0"
            }`}
          >
            {photo.src ? (
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                priority={index === 0}
                unoptimized
                sizes={index === 0 ? "(min-width: 1024px) 720px, 100vw" : "360px"}
                className="object-cover"
              />
            ) : null}
            {index === visible.length - 1 && count > 0 ? (
              <button
                type="button"
                className="absolute right-3 bottom-3 rounded-[2px] bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink"
                onClick={() => dialogRef.current?.showModal()}
              >
                All {count} {count === 1 ? "photo" : "photos"}
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className="w-[min(960px,calc(100%-2rem))] bg-bg p-4 text-ink backdrop:bg-ink/40"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            All {count} {count === 1 ? "photo" : "photos"}
          </p>
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
            <div
              key={`${photo.alt}-full-${index}`}
              className="relative aspect-[4/3] bg-stone"
            >
              {photo.src ? (
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  unoptimized
                  sizes="960px"
                  className="object-cover"
                />
              ) : (
                <p className="absolute inset-0 grid place-items-center text-sm text-muted">
                  Photo unavailable
                </p>
              )}
            </div>
          ))}
        </div>
      </dialog>
    </>
  );
}
