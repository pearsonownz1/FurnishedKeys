"use client";

import { confirmOwnerAvailability } from "@/app/(owner)/owner/actions";
import { StayCalendar } from "@/components/listing/stay-calendar";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

export function OwnerCalendar({
  listings,
  listingId,
  blocked,
}: {
  listings: { id: string; title: string }[];
  listingId: string | null;
  blocked: string[];
}) {
  const router = useRouter();
  const [days, setDays] = useState(blocked);
  const [state, formAction, pending] = useActionState(confirmOwnerAvailability, null);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 pb-24 md:px-10 md:py-8 md:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[40px] leading-[1.05] font-normal">Calendar</h1>
          <p className="mt-1.5 text-muted">Block days you can&apos;t host.</p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="listingId" value={listingId ?? ""} />
          <button
            type="submit"
            disabled={pending || !listingId}
            className="border border-line bg-white px-3.5 py-2 text-[13px] font-semibold disabled:opacity-70"
          >
            Confirm availability
          </button>
        </form>
      </div>
      {state?.formError ? (
        <p className="mt-4 text-sm text-warn" role="alert">
          {state.formError}
        </p>
      ) : null}
      {listings.length === 0 || !listingId ? (
        <p className="mt-8 text-muted">No listings yet.</p>
      ) : (
        <div className="mt-8 max-w-sm">
          <label className="grid gap-1 text-sm">
            Listing
            <select
              className="h-[46px] w-full border border-line bg-white px-3 text-base"
              value={listingId}
              onChange={(event) => {
                router.push(`/owner/calendar?listing=${event.target.value}`);
              }}
            >
              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-6">
            <StayCalendar
              blocked={days}
              onToggle={(iso) =>
                setDays((current) =>
                  current.includes(iso) ? current.filter((day) => day !== iso) : [...current, iso],
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
