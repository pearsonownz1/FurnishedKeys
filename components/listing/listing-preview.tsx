import { StayCalendar } from "@/components/listing/stay-calendar";
import { bedsForRoom, dollarsToCents, type ListingDraft, type ListingStepId } from "@/lib/listing-draft";
import { formatCents } from "@/lib/money";
import {
  calendarUpdatedLabel,
  goodForTags,
  groupedAmenities,
  propertyFactLine,
  propertyTypeName,
  squareFeetFact,
} from "@/lib/property-display";

export function ListingPreview({
  draft,
  step,
  placeLabel,
}: {
  draft: ListingDraft;
  step: ListingStepId;
  placeLabel: string;
}) {
  return (
    <aside className="min-w-0 bg-stone p-5">
      <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
        On your listing page
      </p>
      <div className="mt-4">{section(draft, step, placeLabel)}</div>
    </aside>
  );
}

function section(draft: ListingDraft, step: ListingStepId, placeLabel: string) {
  if (step === "basics") {
    return (
      <div>
        <h2 className="font-serif text-3xl leading-none font-normal">
          {draft.title.trim() || "Untitled listing"}
        </h2>
        <p className="mt-3 text-sm text-muted">
          {[propertyTypeName(draft.propertyType), placeLabel].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-4 text-sm text-muted">The public sees an approximate pin, not this address.</p>
      </div>
    );
  }

  if (step === "rooms") {
    const feet = Number(draft.squareFeet);
    return (
      <div>
        <p className="text-sm text-muted">
          {propertyFactLine({
            type: propertyTypeName(draft.propertyType),
            squareFeet: Number.isFinite(feet) ? feet : null,
            bedrooms: draft.bedrooms.length > 0 ? draft.bedrooms.length : null,
            bathrooms: draft.bathrooms.trim() ? Number(draft.bathrooms) : null,
            pets: null,
          })}
        </p>
        <BedroomCards draft={draft} />
        {squareFeetFact(Number.isFinite(feet) ? feet : null) ? null : (
          <p className="mt-3 text-sm text-muted">Square feet show here after you add them.</p>
        )}
      </div>
    );
  }

  if (step === "photos") {
    const cover = draft.photos.find((photo) => photo.isCover) ?? draft.photos[0];
    return (
      <div>
        <div className="grid grid-cols-2 gap-2">
          {(draft.photos.length > 0 ? draft.photos : [null]).slice(0, 4).map((photo, index) => (
            <div
              key={photo?.id ?? `empty-${index}`}
              className={`relative min-h-20 bg-surface ${index === 0 ? "col-span-2 h-36" : "h-20"}`}
            >
              {photo?.url ? (
                // Signed and local preview URLs are not in the image optimizer allowlist.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          {cover ? "Cover photo leads the gallery." : "Photos show here, up to 20."}
        </p>
      </div>
    );
  }

  if (step === "description") {
    return (
      <div className="space-y-4 text-sm leading-relaxed">
        <p>{draft.summary.trim() || "Your summary shows here."}</p>
        {draft.space.trim() ? (
          <div>
            <h3 className="text-xs font-semibold tracking-[0.1em] text-muted uppercase">The space</h3>
            <p className="mt-2">{draft.space.trim()}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (step === "goodFor") {
    const tags = goodForTags(draft.goodFor);
    if (tags.length === 0) return <p className="text-sm text-muted">Tags you pick show under the title.</p>;
    return (
      <ul className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li key={tag} className="rounded-[2px] border border-ink px-2.5 py-1 text-sm">
            {tag}
          </li>
        ))}
      </ul>
    );
  }

  if (step === "amenities") {
    const groups = groupedAmenities(draft.amenities);
    if (groups.length === 0) return <p className="text-sm text-muted">Checked amenities group here.</p>;
    return <AmenityGroups groups={groups} />;
  }

  if (step === "rent") {
    const rent = dollarsToCents(draft.monthlyRent);
    return (
      <div className="border-t border-ink text-sm">
        <Row label="Rent" value={rent == null ? "—" : `${formatCents(rent)} / month`} />
        {draft.fees.map((fee) => {
          const cents = dollarsToCents(fee.amount);
          if (cents == null) return null;
          return <Row key={fee.kind} label={fee.label} value={formatCents(cents)} />;
        })}
      </div>
    );
  }

  if (step === "availability") {
    const updated = calendarUpdatedLabel(draft.calendarUpdatedAt);
    return (
      <div>
        {updated ? <p className="mb-3 text-sm">{updated}</p> : null}
        <p className="mb-3 text-sm text-muted">
          {[
            draft.minStay.trim() ? `${draft.minStay}-month minimum` : null,
            draft.availableFrom ? `Available from ${draft.availableFrom}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Minimum stay and available-from show with the calendar."}
        </p>
        <StayCalendar blocked={draft.blockedDates} marked={draft.availableFrom} />
      </div>
    );
  }

  if (step === "rules") {
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>{draft.petsAllowed ? draft.petPolicy.trim() || "Pets allowed" : "No pets"}</p>
        <p>{draft.noSmoking ? "No smoking" : "Smoking allowed"}</p>
        {draft.houseRules.trim() ? <p>{draft.houseRules.trim()}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <h2 className="font-serif text-3xl leading-none font-normal">
        {draft.title.trim() || "Untitled listing"}
      </h2>
      <p className="text-muted">
        {propertyFactLine({
          type: propertyTypeName(draft.propertyType),
          squareFeet: Number(draft.squareFeet) || null,
          bedrooms: draft.bedrooms.length || null,
          bathrooms: draft.bathrooms.trim() ? Number(draft.bathrooms) : null,
          pets: draft.petsAllowed ? "Pets allowed" : "No pets",
        })}
      </p>
    </div>
  );
}

function BedroomCards({ draft }: { draft: ListingDraft }) {
  if (draft.bedrooms.length === 0) {
    return <p className="mt-4 text-sm text-muted">Each bedroom shows as its own card.</p>;
  }
  return (
    <ul className="mt-4 grid gap-2">
      {draft.bedrooms.map((room, index) => {
        const beds = bedsForRoom(room);
        return (
          <li key={room.key} className="border border-line bg-surface px-3 py-3">
            <p className="text-sm font-semibold">{room.label.trim() || `Bedroom ${index + 1}`}</p>
            {beds ? <p className="mt-1 text-sm text-muted">{beds}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function AmenityGroups({ groups }: { groups: { group: string; labels: string[] }[] }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.group || "more"}>
          {group.group ? <h3 className="text-sm font-semibold">{group.group}</h3> : null}
          <ul className="mt-1 space-y-1 text-sm">
            {group.labels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-2">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
