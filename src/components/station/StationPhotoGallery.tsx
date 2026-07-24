"use client";

import { useRef } from "react";
import { AppIcon } from "@/src/components/ui/AppIcon";
import type { StationAmenitiesData } from "@/src/types";

export function StationPhotoGallery({
  photos,
  placeId,
}: {
  photos: StationAmenitiesData["photos"];
  placeId: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({
      left: direction * Math.max(scrollerRef.current.clientWidth * 0.75, 240),
      behavior: "smooth",
    });
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Station photos</h3>
          <p className="mt-0.5 text-xs text-muted">Photos provided by the place listing.</p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Show previous station photos"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground transition hover:border-border hover:text-primary"
          >
            <AppIcon name="arrow_back" className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Show next station photos"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground transition hover:border-border hover:text-primary"
          >
            <AppIcon name="arrow_forward" className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2" dir="ltr">
        {photos.map((photo, index) => (
          <figure key={index} className="w-[82%] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-background sm:w-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/place-photo?placeId=${encodeURIComponent(placeId)}&index=${index}`}
              alt={`Station photo ${index + 1}`}
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
            {photo.attributionName ? (
              <figcaption className="truncate px-3 py-2 text-[0.65rem] text-muted">
                Photo by {photo.attributionUri ? (
                  <a href={photo.attributionUri} target="_blank" rel="noreferrer" className="font-medium text-primary">
                    {photo.attributionName}
                  </a>
                ) : photo.attributionName}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  );
}
