import { z } from "zod";
import { propertyTypes } from "@/lib/db/types";
import { amenityKeys } from "./amenities";
import { SOURCE_PATTERN } from "./access";
import { goodForKeys } from "./good-for";
import { MAX_LISTING_PHOTOS } from "./setup";

const propertyTypeSchema = z.enum(propertyTypes);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Checked only for a new account. Signed-in callers may omit it. */
export const ownerPasswordSchema = z.string().min(8).max(72);

export const startListingSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(40),
  property_type: propertyTypeSchema,
  location_id: z.string().uuid(),
  source: z.string().trim().regex(SOURCE_PATTERN).optional(),
  password: z.string().optional(),
});

export const createListingSchema = z.object({
  location_id: z.string().uuid(),
  property_type: propertyTypeSchema,
  title: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().min(1).max(8000).optional(),
  bedrooms: z.number().int().min(0).max(30).optional(),
  bathrooms: z.number().min(0).max(30).optional(),
  max_occupants: z.number().int().min(1).max(50).optional(),
  monthly_rent_cents: z.number().int().min(0).max(100_000_000).optional(),
});

const availabilitySchema = z
  .object({
    available_from: dateSchema,
    available_to: dateSchema.nullable().optional(),
  })
  .refine((window) => !window.available_to || window.available_to >= window.available_from, {
    message: "available_to must be on or after available_from",
  });

const bedroomSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  beds: z.string().trim().min(1).max(80),
});

const blockedDateSchema = z
  .object({
    start_date: dateSchema,
    end_date: dateSchema,
    note: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .refine((span) => span.end_date >= span.start_date, {
    message: "end_date must be on or after start_date",
  });

function uniqueKeys(keys: string[], context: z.RefinementCtx, label: string) {
  if (new Set(keys).size !== keys.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${label} must be unique`,
    });
  }
}

export const patchListingSchema = z
  .object({
    location_id: z.string().uuid().optional(),
    property_type: propertyTypeSchema.optional(),
    title: z.string().trim().min(1).max(140).nullable().optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80)
      .nullable()
      .optional(),
    description: z.string().trim().min(1).max(8000).nullable().optional(),
    bathrooms: z.number().min(0).max(30).nullable().optional(),
    max_occupants: z.number().int().min(1).max(50).nullable().optional(),
    pets_allowed: z.boolean().optional(),
    pet_policy: z.string().trim().min(1).max(2000).nullable().optional(),
    monthly_rent_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
    min_stay_months: z.number().int().min(1).max(120).optional(),
    max_stay_months: z.number().int().min(1).max(120).nullable().optional(),
    amenities: z
      .array(z.enum(amenityKeys))
      .max(amenityKeys.length)
      .superRefine((keys, context) => uniqueKeys(keys, context, "Amenities"))
      .optional(),
    good_for: z
      .array(z.enum(goodForKeys))
      .max(goodForKeys.length)
      .superRefine((keys, context) => uniqueKeys(keys, context, "Good for"))
      .optional(),
    house_rules: z.string().trim().min(1).max(8000).nullable().optional(),
    square_feet: z.number().int().positive().max(100_000).nullable().optional(),
    space_description: z.string().trim().min(1).max(8000).nullable().optional(),
    smoking_allowed: z.boolean().optional(),
    bedrooms: z.array(bedroomSchema).max(30).optional(),
    approx_lat: z.number().min(-90).max(90).nullable().optional(),
    approx_lng: z.number().min(-180).max(180).nullable().optional(),
    address_private: z.string().trim().min(1).max(500).nullable().optional(),
    management: z.enum(["self_managed", "fk_managed"]).optional(),
    availability: z.array(availabilitySchema).max(24).optional(),
  })
  .strict();

export const calendarSchema = z
  .object({
    availability: z.array(availabilitySchema).max(24),
    blocked_dates: z.array(blockedDateSchema).max(366),
  })
  .strict();

export const photoUploadSchema = z.object({
  files: z
    .array(z.object({ name: z.string().trim().min(1).max(200) }))
    .min(1)
    .max(MAX_LISTING_PHOTOS),
});

export const checkoutSchema = z.object({
  auto_renew: z.boolean().optional(),
});

export const reviewSchema = z
  .object({
    action: z.enum(["approve", "request_changes", "reject"]),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (value.action !== "approve" && !value.note) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "A note is required",
      });
    }
  });

export function listingPhotoPath(listingId: string, name: string): string | null {
  const base = name.split(/[/\\]/).pop() ?? "";
  const match = /^([a-zA-Z0-9._-]{1,80})\.(jpg|jpeg|png|webp|avif)$/i.exec(base);
  if (!match) return null;
  const file = `${match[1].toLowerCase()}-${crypto.randomUUID().slice(0, 8)}.${match[2].toLowerCase()}`;
  return `${listingId}/${file}`;
}
