import type { TrustCell } from "@/lib/property-display";

export function TrustStrip({ cells }: { cells: TrustCell[] }) {
  if (cells.length === 0) return null;
  return (
    <div
      className={`mt-6 grid border-y border-line ${cells.length > 1 ? "sm:grid-cols-2" : ""}`}
    >
      {cells.map((cell) =>
        cell.id === "calendar" ? (
          <p key={cell.id} className="px-1 py-4 text-sm sm:px-4">
            {cell.text}
          </p>
        ) : (
          <div key={cell.id} className="border-line px-1 py-4 sm:border-l sm:px-4">
            <p className="text-sm font-semibold">{cell.name}</p>
            <p className="mt-1 text-sm text-muted">{cell.since}</p>
          </div>
        ),
      )}
    </div>
  );
}
