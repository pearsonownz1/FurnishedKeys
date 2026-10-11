"use client";

import type { MapPoint } from "@/components/browse/area-map";
import dynamic from "next/dynamic";

const AreaMap = dynamic(
  () => import("@/components/browse/area-map").then((mod) => mod.AreaMap),
  {
    ssr: false,
    loading: () => <div className="h-[150px] w-full bg-[#e8e6df]" />,
  },
);

export function PropertyMap({
  point,
  center,
}: {
  point: MapPoint | null;
  center: { lat: number; lng: number } | null;
}) {
  return (
    <div className="h-[150px] overflow-hidden rounded-[2px]">
      <AreaMap
        points={point ? [point] : []}
        activeId={point?.id ?? null}
        center={center}
        showPrices={false}
        navigate={false}
        showNote={false}
      />
    </div>
  );
}
