/**
 * Hand-written types for the FurnishedKeys schema.
 * Source of truth: supabase/migrations/20261011033000_init.sql.
 *
 * `listings.address_private` is not selectable by anon or authenticated.
 * Use the `listings_public` view, or `listingPublicColumns`, for catalog reads.
 * Owners and admins load the street address with
 * `supabase.rpc("listing_address", { target_listing })`.
 *
 * Postgres `numeric` columns (`bathrooms`, `approx_lat`, `approx_lng`) are
 * typed as numbers here, matching Supabase generated types. The Data API may
 * return them as strings; coerce with Number before math.
 */

export const userRoles = ["renter", "owner", "manager", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export const propertyTypes = [
  "adu",
  "apartment",
  "room",
  "house",
  "other",
] as const;
export type PropertyType = (typeof propertyTypes)[number];

export const listingManagements = ["self_managed", "fk_managed"] as const;
export type ListingManagement = (typeof listingManagements)[number];

export const listingStatuses = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "archived",
] as const;
export type ListingStatus = (typeof listingStatuses)[number];

export const listingFeeStatuses = ["unpaid", "paid", "waived"] as const;
export type ListingFeeStatus = (typeof listingFeeStatuses)[number];

export const feeKinds = [
  "utilities",
  "deposit",
  "cleaning",
  "pet",
  "other",
] as const;
export type FeeKind = (typeof feeKinds)[number];

export const feeFrequencies = ["one_time", "monthly"] as const;
export type FeeFrequency = (typeof feeFrequencies)[number];

export const inquiryStatuses = ["new", "responded", "closed"] as const;
export type InquiryStatus = (typeof inquiryStatuses)[number];

export const furnishedLevels = ["yes", "partly", "no"] as const;
export type FurnishedLevel = (typeof furnishedLevels)[number];

export const ownerLeadStatuses = ["new", "contacted", "closed"] as const;
export type OwnerLeadStatus = (typeof ownerLeadStatuses)[number];

export type Location = {
  id: string;
  slug: string;
  name: string;
  region: string;
  state: string;
  country: string;
  active: boolean;
  sort: number;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  company_name: string | null;
  created_at: string;
};

export type Listing = {
  id: string;
  owner_id: string;
  location_id: string;
  slug: string;
  title: string;
  description: string | null;
  property_type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  max_occupants: number;
  pets_allowed: boolean;
  pet_policy: string | null;
  monthly_rent_cents: number;
  min_stay_months: number;
  max_stay_months: number | null;
  amenities: string[];
  house_rules: string | null;
  approx_lat: number | null;
  approx_lng: number | null;
  address_private: string | null;
  management: ListingManagement;
  status: ListingStatus;
  is_demo: boolean;
  listing_fee_status: ListingFeeStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingPublic = Omit<Listing, "address_private">;

export type ListingFee = {
  id: string;
  listing_id: string;
  kind: FeeKind;
  label: string;
  amount_cents: number;
  frequency: FeeFrequency;
  refundable: boolean;
};

export type ListingPhoto = {
  id: string;
  listing_id: string;
  storage_path: string;
  caption: string | null;
  sort: number;
};

export type AvailabilityWindow = {
  id: string;
  listing_id: string;
  available_from: string;
  available_to: string | null;
  last_confirmed_at: string | null;
  confirmed_by: string | null;
};

export type Inquiry = {
  id: string;
  listing_id: string;
  renter_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  move_in: string;
  move_out: string | null;
  occupants: number;
  pets: string | null;
  message: string;
  status: InquiryStatus;
  assigned_to: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  inquiry_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
};

export type OwnerLead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  property_address: string | null;
  location_id: string | null;
  property_type: PropertyType | null;
  furnished: FurnishedLevel | null;
  current_use: string | null;
  available_from: string | null;
  notes: string | null;
  source: string;
  status: OwnerLeadStatus;
  assigned_to: string | null;
  created_at: string;
};

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type LocationInsert = WithOptional<Location, "id" | "active" | "sort">;
export type ProfileInsert = WithOptional<
  Profile,
  "full_name" | "email" | "phone" | "role" | "company_name" | "created_at"
>;
export type ListingInsert = WithOptional<
  Listing,
  | "id"
  | "description"
  | "pets_allowed"
  | "pet_policy"
  | "min_stay_months"
  | "max_stay_months"
  | "amenities"
  | "house_rules"
  | "approx_lat"
  | "approx_lng"
  | "address_private"
  | "management"
  | "status"
  | "is_demo"
  | "listing_fee_status"
  | "reviewed_by"
  | "reviewed_at"
  | "rejection_reason"
  | "created_at"
  | "updated_at"
>;
export type ListingFeeInsert = WithOptional<ListingFee, "id" | "refundable">;
export type ListingPhotoInsert = WithOptional<
  ListingPhoto,
  "id" | "caption" | "sort"
>;
export type AvailabilityWindowInsert = WithOptional<
  AvailabilityWindow,
  "id" | "available_to" | "last_confirmed_at" | "confirmed_by"
>;
export type InquiryInsert = WithOptional<
  Inquiry,
  | "id"
  | "renter_id"
  | "phone"
  | "move_out"
  | "occupants"
  | "pets"
  | "status"
  | "assigned_to"
  | "created_at"
>;
export type MessageInsert = WithOptional<
  Message,
  "id" | "sender_id" | "created_at"
>;
export type OwnerLeadInsert = WithOptional<
  OwnerLead,
  | "id"
  | "phone"
  | "property_address"
  | "location_id"
  | "property_type"
  | "furnished"
  | "current_use"
  | "available_from"
  | "notes"
  | "source"
  | "status"
  | "assigned_to"
  | "created_at"
>;

export type LocationUpdate = Partial<LocationInsert>;
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">>;
export type ListingUpdate = Partial<Omit<Listing, "id" | "created_at">>;
export type ListingFeeUpdate = Partial<Omit<ListingFee, "id">>;
export type ListingPhotoUpdate = Partial<Omit<ListingPhoto, "id">>;
export type AvailabilityWindowUpdate = Partial<Omit<AvailabilityWindow, "id">>;
export type InquiryUpdate = Partial<Omit<Inquiry, "id" | "created_at">>;
export type MessageUpdate = Partial<Omit<Message, "id" | "created_at">>;
export type OwnerLeadUpdate = Partial<Omit<OwnerLead, "id" | "created_at">>;

type ListingPublicColumn = Exclude<keyof Listing, "address_private">;

function listingColumns<const T extends readonly ListingPublicColumn[]>(
  columns: Exclude<ListingPublicColumn, T[number]> extends never ? T : never,
) {
  return columns;
}

export const listingPublicColumns = listingColumns([
  "id",
  "owner_id",
  "location_id",
  "slug",
  "title",
  "description",
  "property_type",
  "bedrooms",
  "bathrooms",
  "max_occupants",
  "pets_allowed",
  "pet_policy",
  "monthly_rent_cents",
  "min_stay_months",
  "max_stay_months",
  "amenities",
  "house_rules",
  "approx_lat",
  "approx_lng",
  "management",
  "status",
  "is_demo",
  "listing_fee_status",
  "reviewed_by",
  "reviewed_at",
  "rejection_reason",
  "created_at",
  "updated_at",
]);

export const listingFieldNames = [
  ...listingPublicColumns,
  "address_private",
] as const satisfies readonly (keyof Listing)[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      locations: Table<Location, LocationInsert, LocationUpdate>;
      profiles: Table<Profile, ProfileInsert, ProfileUpdate>;
      listings: Table<Listing, ListingInsert, ListingUpdate>;
      listing_fees: Table<ListingFee, ListingFeeInsert, ListingFeeUpdate>;
      listing_photos: Table<ListingPhoto, ListingPhotoInsert, ListingPhotoUpdate>;
      availability_windows: Table<
        AvailabilityWindow,
        AvailabilityWindowInsert,
        AvailabilityWindowUpdate
      >;
      inquiries: Table<Inquiry, InquiryInsert, InquiryUpdate>;
      messages: Table<Message, MessageInsert, MessageUpdate>;
      owner_leads: Table<OwnerLead, OwnerLeadInsert, OwnerLeadUpdate>;
    };
    Views: {
      listings_public: {
        Row: ListingPublic;
        Relationships: Relationship[];
      };
    };
    Functions: {
      listing_address: {
        Args: { target_listing: string };
        Returns: string | null;
      };
    };
    Enums: {
      user_role: UserRole;
      property_type: PropertyType;
      listing_management: ListingManagement;
      listing_status: ListingStatus;
      listing_fee_status: ListingFeeStatus;
      fee_kind: FeeKind;
      fee_frequency: FeeFrequency;
      inquiry_status: InquiryStatus;
      furnished_level: FurnishedLevel;
      owner_lead_status: OwnerLeadStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
