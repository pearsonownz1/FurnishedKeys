/**
 * Hand-written types for the FurnishedKeys schema.
 * Source of truth: supabase/migrations/. The listing fee columns and
 * listing_payments are added in 20261011053000_listing_subscription.sql.
 * Setup columns, listing_bedrooms, listing_blocked_dates, and
 * public_listing_landlord are added in 20261011070000_listing_setup_fields.sql.
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
  "changes_requested",
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

export const inquiryStatuses = ["new", "responded", "closed", "declined"] as const;
export type InquiryStatus = (typeof inquiryStatuses)[number];

export const furnishedLevels = ["yes", "partly", "no"] as const;
export type FurnishedLevel = (typeof furnishedLevels)[number];

export const ownerLeadStatuses = ["new", "contacted", "closed"] as const;
export type OwnerLeadStatus = (typeof ownerLeadStatuses)[number];

export const ownerLeadInterests = [
  "list_myself",
  "full_management",
  "not_sure",
] as const;
export type OwnerLeadInterest = (typeof ownerLeadInterests)[number];

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
  /** When false, new-inquiry mail to this owner is skipped. Default true. */
  notify_new_inquiry: boolean;
  /** When false, renter-message mail to this owner is skipped. Default true. */
  notify_new_message: boolean;
  /** When false, approved, changes-requested, and rejected mail is skipped. Default true. */
  notify_listing_status: boolean;
  role: UserRole;
  company_name: string | null;
  created_at: string;
};

export type Listing = {
  id: string;
  owner_id: string;
  location_id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  property_type: PropertyType;
  bedrooms: number | null;
  bathrooms: number | null;
  max_occupants: number | null;
  pets_allowed: boolean;
  pet_policy: string | null;
  monthly_rent_cents: number | null;
  min_stay_months: number;
  max_stay_months: number | null;
  amenities: string[];
  /** Who the home suits. Keys from lib/listings/good-for.ts. */
  good_for: string[];
  house_rules: string | null;
  square_feet: number | null;
  /** The space. Longer than the short description. */
  space_description: string | null;
  smoking_allowed: boolean;
  /** When availability windows or blocked dates last changed. */
  calendar_updated_at: string | null;
  approx_lat: number | null;
  approx_lng: number | null;
  address_private: string | null;
  management: ListingManagement;
  status: ListingStatus;
  is_demo: boolean;
  listing_fee_status: ListingFeeStatus;
  fee_paid_through: string | null;
  paid_at: string | null;
  admin_note: string | null;
  stripe_subscription_id: string | null;
  /** True when the yearly subscription is set to cancel at period end. */
  renewal_canceled: boolean;
  /** Acquisition slug. Default `web`. Owners cannot change it after insert. */
  source: string;
  /** Last wizard step saved on the draft. Null until the owner saves a step. */
  setup_step: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingPrivateField =
  | "address_private"
  | "fee_paid_through"
  | "paid_at"
  | "admin_note"
  | "stripe_subscription_id"
  | "renewal_canceled"
  | "source"
  | "setup_step";

/** Catalog row. Billing, attribution, the admin note, and the street address are omitted. */
export type ListingPublic = Omit<Listing, ListingPrivateField>;

export type ListingPaymentStatus =
  | "paid"
  | "payment_failed"
  | "subscription_deleted"
  | "cancel_scheduled"
  | "cancel_cleared"
  | "waived_no_stripe";

export type ListingPayment = {
  id: string;
  listing_id: string;
  stripe_event_id: string;
  stripe_session_id: string | null;
  stripe_invoice_id: string | null;
  stripe_subscription_id: string | null;
  amount_cents: number;
  status: ListingPaymentStatus;
  period_end: string | null;
  created_at: string;
};

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
  is_cover: boolean;
};

export type ListingBedroom = {
  id: string;
  listing_id: string;
  sort: number;
  label: string;
  beds: string;
};

export type ListingBlockedDate = {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
};

export type PublicLandlord = {
  first_name: string | null;
  last_initial: string | null;
  member_since: string;
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
  /** sha256 hex of the current renter link. Null until the inquiry is created with a token. */
  renter_token_hash: string | null;
  last_message_at: string | null;
  owner_unread: number;
  renter_unread: number;
  created_at: string;
};

export type Message = {
  id: string;
  inquiry_id: string;
  sender_id: string | null;
  sender_role: "owner" | "renter";
  body: string;
  /** True after Resend accepts the email to the other party. */
  emailed: boolean;
  created_at: string;
};

export type AuthMailAttempt = {
  id: string;
  bucket: "email" | "ip";
  subject: string;
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
  interest: OwnerLeadInterest | null;
  source: string;
  status: OwnerLeadStatus;
  assigned_to: string | null;
  created_at: string;
};

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type LocationInsert = WithOptional<Location, "id" | "active" | "sort">;
export type ProfileInsert = WithOptional<
  Profile,
  | "full_name"
  | "email"
  | "phone"
  | "notify_new_inquiry"
  | "notify_new_message"
  | "notify_listing_status"
  | "role"
  | "company_name"
  | "created_at"
>;
export type ListingInsert = WithOptional<
  Listing,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "bedrooms"
  | "bathrooms"
  | "max_occupants"
  | "pets_allowed"
  | "pet_policy"
  | "monthly_rent_cents"
  | "min_stay_months"
  | "max_stay_months"
  | "amenities"
  | "good_for"
  | "house_rules"
  | "square_feet"
  | "space_description"
  | "smoking_allowed"
  | "calendar_updated_at"
  | "approx_lat"
  | "approx_lng"
  | "address_private"
  | "management"
  | "status"
  | "is_demo"
  | "listing_fee_status"
  | "fee_paid_through"
  | "paid_at"
  | "admin_note"
  | "stripe_subscription_id"
  | "renewal_canceled"
  | "source"
  | "setup_step"
  | "reviewed_by"
  | "reviewed_at"
  | "rejection_reason"
  | "created_at"
  | "updated_at"
>;
export type ListingPaymentInsert = WithOptional<
  ListingPayment,
  | "id"
  | "stripe_session_id"
  | "stripe_invoice_id"
  | "stripe_subscription_id"
  | "period_end"
  | "created_at"
>;
export type ListingFeeInsert = WithOptional<ListingFee, "id" | "refundable">;
export type ListingPhotoInsert = WithOptional<
  ListingPhoto,
  "id" | "caption" | "sort" | "is_cover"
>;
export type ListingBedroomInsert = WithOptional<ListingBedroom, "id" | "sort" | "label">;
export type ListingBlockedDateInsert = WithOptional<ListingBlockedDate, "id" | "note">;
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
  | "renter_token_hash"
  | "last_message_at"
  | "owner_unread"
  | "renter_unread"
  | "created_at"
>;
export type MessageInsert = WithOptional<
  Message,
  "id" | "sender_id" | "sender_role" | "emailed" | "created_at"
>;
export type AuthMailAttemptInsert = WithOptional<AuthMailAttempt, "id" | "created_at">;
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
  | "interest"
  | "source"
  | "status"
  | "assigned_to"
  | "created_at"
>;

export type LocationUpdate = Partial<LocationInsert>;
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">>;
export type ListingUpdate = Partial<Omit<Listing, "id" | "created_at">>;
export type ListingPaymentUpdate = Partial<Omit<ListingPayment, "id" | "created_at">>;
export type ListingFeeUpdate = Partial<Omit<ListingFee, "id">>;
export type ListingPhotoUpdate = Partial<Omit<ListingPhoto, "id">>;
export type ListingBedroomUpdate = Partial<Omit<ListingBedroom, "id">>;
export type ListingBlockedDateUpdate = Partial<Omit<ListingBlockedDate, "id">>;
export type AvailabilityWindowUpdate = Partial<Omit<AvailabilityWindow, "id">>;
export type InquiryUpdate = Partial<Omit<Inquiry, "id" | "created_at">>;
export type MessageUpdate = Partial<Omit<Message, "id" | "created_at">>;
export type OwnerLeadUpdate = Partial<Omit<OwnerLead, "id" | "created_at">>;

type ListingPublicColumn = Exclude<keyof Listing, ListingPrivateField>;

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
  "good_for",
  "house_rules",
  "square_feet",
  "space_description",
  "smoking_allowed",
  "calendar_updated_at",
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

export const listingOwnerColumns = [
  ...listingPublicColumns,
  "fee_paid_through",
  "paid_at",
  "admin_note",
  "stripe_subscription_id",
  "renewal_canceled",
  "source",
  "setup_step",
] as const;

export const listingFieldNames = [
  ...listingOwnerColumns,
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
      listing_bedrooms: Table<ListingBedroom, ListingBedroomInsert, ListingBedroomUpdate>;
      listing_blocked_dates: Table<
        ListingBlockedDate,
        ListingBlockedDateInsert,
        ListingBlockedDateUpdate
      >;
      availability_windows: Table<
        AvailabilityWindow,
        AvailabilityWindowInsert,
        AvailabilityWindowUpdate
      >;
      inquiries: Table<Inquiry, InquiryInsert, InquiryUpdate>;
      messages: Table<Message, MessageInsert, MessageUpdate>;
      auth_mail_attempts: Table<
        AuthMailAttempt,
        AuthMailAttemptInsert,
        Partial<Omit<AuthMailAttempt, "id" | "created_at">>
      >;
      owner_leads: Table<OwnerLead, OwnerLeadInsert, OwnerLeadUpdate>;
      listing_payments: Table<
        ListingPayment,
        ListingPaymentInsert,
        ListingPaymentUpdate
      >;
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
      public_listing_landlord: {
        Args: { listing_id: string };
        Returns: PublicLandlord[];
      };
      apply_listing_fee_event: {
        Args: {
          event_id: string;
          target_listing: string;
          session_id: string | null;
          invoice_id: string | null;
          subscription_id: string | null;
          amount_cents: number;
          payment_status: string;
          period_end: string | null;
          update_listing: boolean;
          next_fee_status: ListingFeeStatus;
          next_paid_through: string | null;
          next_paid_at: string | null;
          next_subscription_id: string | null;
          next_renewal_canceled: boolean;
        };
        Returns: boolean;
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
      owner_lead_interest: OwnerLeadInterest;
    };
    CompositeTypes: Record<string, never>;
  };
};
