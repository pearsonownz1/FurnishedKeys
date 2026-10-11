import { locationById } from "@/lib/locations";
import {
  confirmedAgo,
  filterCounts,
  initials,
  inquiryPreview,
  listingStatusCaption,
  monthDay,
  setupProgress,
  stayRange,
  threadMessages,
  type DashboardInquiry,
  type DashboardListing,
  type DashboardOwner,
  type OwnerDashboardData,
  type SetupSignals,
} from "@/lib/owner-dashboard";

const ownerId = "11111111-1111-4111-8111-111111111111";
const draftId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const reviewId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const liveId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";

function cityName(): string {
  return locationById("c3a1e0b2-4d5f-4a6b-8c7d-111111111101")?.name ?? "";
}

function filled(patch: Partial<SetupSignals>): SetupSignals {
  return {
    title: "Home",
    bedroomCount: 1,
    bathrooms: 1,
    photoCount: 3,
    description: "A furnished one-bedroom with a full kitchen.",
    goodFor: ["remote_workers"],
    amenities: ["wifi", "washer_dryer"],
    monthlyRentCents: 185_000,
    availableFrom: "2026-11-01",
    houseRules: "Quiet after 10.",
    petPolicy: null,
    petsAllowed: false,
    smokingAllowed: false,
    ...patch,
  };
}

/** Sample board used only when local dev has no signed-in owner. */
export function fixtureDashboard(now = new Date()): OwnerDashboardData {
  const city = cityName();
  const owner: DashboardOwner = {
    name: "Guy Pearson",
    email: "guy@furnishedkeys.com",
    phone: "",
    initials: initials("Guy Pearson", "guy@furnishedkeys.com"),
  };
  const draftProgress = setupProgress(
    filled({
      title: "Charming Home on West Side",
      photoCount: 0,
      description: "",
      goodFor: [],
      amenities: [],
      monthlyRentCents: null,
      availableFrom: null,
      houseRules: null,
    }),
  );
  const ready = setupProgress(filled({}));
  const listings: DashboardListing[] = [
    {
      id: draftId,
      title: "Charming Home on West Side",
      city,
      status: "draft",
      typeLabel: "ADU",
      bedLabel: null,
      rentLabel: null,
      coverUrl: null,
      slug: null,
      progress: draftProgress,
      inquiryCount: 0,
      lastConfirmedAt: null,
      caption: listingStatusCaption({
        status: "draft",
        progress: draftProgress,
        submittedOn: null,
        confirmedAgo: null,
        inquiryCount: 0,
        adminNote: null,
      }),
    },
    {
      id: reviewId,
      title: "NW Crossing backyard cottage",
      city,
      status: "in_review",
      typeLabel: "ADU",
      bedLabel: "1 bed",
      rentLabel: "$2,350/mo",
      coverUrl: "/demo/p1.jpg",
      slug: "detached-adu-river-trail",
      progress: ready,
      inquiryCount: 0,
      lastConfirmedAt: null,
      caption: listingStatusCaption({
        status: "in_review",
        progress: ready,
        submittedOn: "Oct 10",
        confirmedAgo: null,
        inquiryCount: 0,
        adminNote: null,
      }),
    },
    {
      id: liveId,
      title: "Orchard District one-bedroom",
      city,
      status: "live",
      typeLabel: "Apartment",
      bedLabel: "1 bed",
      rentLabel: "$1,850/mo",
      coverUrl: "/demo/p2.jpg",
      slug: "orchard-one-bedroom",
      progress: ready,
      inquiryCount: 2,
      lastConfirmedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      caption: listingStatusCaption({
        status: "live",
        progress: ready,
        submittedOn: null,
        confirmedAgo: confirmedAgo(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), now),
        inquiryCount: 2,
        adminNote: null,
      }),
    },
  ];

  const jordanAt = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const replyAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const followAt = new Date(now.getTime() - 12 * 60 * 1000).toISOString();
  const priyaAt = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString();
  const samAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const samReplyAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString();

  const jordanMessages = threadMessages({
    inquiryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    body: "Hi, I'm a travel nurse starting at the hospital Dec 1 for 13 weeks. Is the washer in-unit, and is there parking?",
    createdAt: jordanAt,
    renterName: "Jordan M.",
    ownerId,
    now,
    replies: [
      {
        id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
        body: "Hi Jordan, yes, washer and dryer are in the unit and there's one off-street spot. Dec 1 works.",
        createdAt: replyAt,
        senderId: ownerId,
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
        body: "Great! What's the next step?",
        createdAt: followAt,
        senderId: "renter",
      },
    ],
  });
  const priyaMessages = threadMessages({
    inquiryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    body: "Hi! Relocating for work and hoping the January dates are open.",
    createdAt: priyaAt,
    renterName: "Priya S.",
    ownerId,
    now,
    replies: [],
  });
  const samMessages = threadMessages({
    inquiryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    body: "Would Nov 15 through Jan 15 work for a one-bedroom?",
    createdAt: samAt,
    renterName: "Sam K.",
    ownerId,
    now,
    replies: [
      {
        id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
        body: "Thanks Sam, those dates work.",
        createdAt: samReplyAt,
        senderId: ownerId,
      },
    ],
  });

  const inquiries: DashboardInquiry[] = [
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
      listingId: liveId,
      listingTitle: "Orchard District",
      name: "Jordan M.",
      firstName: "Jordan",
      email: "jordan@email.com",
      phone: "(541) 555-0142",
      status: "new",
      createdAt: followAt,
      listTime: "2h",
      dateLabel: stayRange("2026-12-01", "2027-03-01"),
      occupantLabel: "1 occupant",
      petsLabel: "No pets",
      preview: inquiryPreview(jordanMessages),
      unread: true,
      messages: jordanMessages,
    },
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
      listingId: liveId,
      listingTitle: "Orchard District",
      name: "Priya S.",
      firstName: "Priya",
      email: "priya@email.com",
      phone: null,
      status: "new",
      createdAt: priyaAt,
      listTime: "Yesterday",
      dateLabel: stayRange("2027-01-05", "2027-04-05"),
      occupantLabel: "1 occupant",
      petsLabel: "No pets",
      preview: inquiryPreview(priyaMessages),
      unread: true,
      messages: priyaMessages,
    },
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
      listingId: liveId,
      listingTitle: "Orchard District",
      name: "Sam K.",
      firstName: "Sam",
      email: "sam@email.com",
      phone: null,
      status: "responded",
      createdAt: samReplyAt,
      listTime: monthDay(samAt),
      dateLabel: stayRange("2026-11-15", "2027-01-15"),
      occupantLabel: "2 occupants",
      petsLabel: "No pets",
      preview: inquiryPreview(samMessages),
      unread: false,
      messages: samMessages,
    },
  ];

  return {
    signedIn: true,
    owner,
    locationId: locationById("c3a1e0b2-4d5f-4a6b-8c7d-111111111101")?.id ?? "",
    listings,
    inquiries,
    unread: inquiries.filter((inquiry) => inquiry.unread).length,
    counts: filterCounts(listings),
  };
}
