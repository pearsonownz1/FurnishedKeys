import { locationById } from "@/lib/locations";
import { initials } from "@/lib/owner-dashboard";
import {
  composeActivity,
  listingChecks,
  shortName,
  type AdminConsole,
  type AdminInquiry,
  type AdminLead,
  type AdminListingRow,
  type AdminReview,
  type AdminUser,
} from "@/lib/admin-console";

const river = "b1000000-0000-4000-8000-000000000001";
const garage = "b1000000-0000-4000-8000-000000000002";
const hillside = "b1000000-0000-4000-8000-000000000003";
const courtyard = "b1000000-0000-4000-8000-000000000004";
const garden = "b1000000-0000-4000-8000-000000000005";
const unfinished = "b1000000-0000-4000-8000-000000000006";
const seasonal = "b1000000-0000-4000-8000-000000000007";

function cityName(): string {
  return locationById("c3a1e0b2-4d5f-4a6b-8c7d-111111111101")?.name ?? "";
}

function ago(now: Date, ms: number): string {
  return new Date(now.getTime() - ms).toISOString();
}

const hour = 60 * 60 * 1000;
const day = 24 * hour;

/** Local sample used when dev has no signed-in staff member. */
export function fixtureAdminConsole(now = new Date()): AdminConsole {
  const city = cityName();
  const staffName = "Guy Pearson";
  const staffEmail = "guy@furnishedkeys.com";

  const reviews: AdminReview[] = [
    {
      id: garage,
      title: "West side garage studio",
      ownerName: "Noah Hale",
      city,
      submittedAt: ago(now, 26 * hour),
      coverUrl: "/demo/p2.jpg",
      description:
        "A studio above the garage with its own entry, a kitchenette, and a stacked washer and dryer. Quiet street, a short walk to coffee.",
      monthlyRentCents: 189000,
      bedrooms: 0,
      bathrooms: 1,
      squareFeet: 420,
      minStayMonths: 1,
      photos: [
        { src: "/demo/p2.jpg", alt: "West side garage studio" },
        { src: "/demo/p3.jpg", alt: "Kitchenette" },
        { src: "/demo/hero.jpg", alt: "Living area" },
      ],
      checks: listingChecks({
        photoCount: 3,
        hasCover: true,
        monthlyRentCents: 189000,
        feeCount: 1,
        hasAddress: true,
        calendarConfirmed: true,
        houseRules: null,
      }),
    },
    {
      id: river,
      title: "River trail cottage",
      ownerName: "Elena Marsh",
      city,
      submittedAt: ago(now, 2 * hour),
      coverUrl: "/demo/p1.jpg",
      description:
        "Detached cottage with its own entry and parking, a full kitchen, washer and dryer. A short drive to downtown and the river trail.",
      monthlyRentCents: 218000,
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 640,
      minStayMonths: 3,
      photos: [
        { src: "/demo/p1.jpg", alt: "River trail cottage" },
        { src: "/demo/p2.jpg", alt: "Bedroom" },
        { src: "/demo/p3.jpg", alt: "Kitchen" },
        { src: "/demo/hero.jpg", alt: "Living room" },
      ],
      checks: listingChecks({
        photoCount: 4,
        hasCover: true,
        monthlyRentCents: 218000,
        feeCount: 2,
        hasAddress: true,
        calendarConfirmed: true,
        houseRules: "No smoking. Quiet hours after 10.",
      }),
    },
  ];

  const listings: AdminListingRow[] = [
    { id: river, title: "River trail cottage", ownerName: "Elena Marsh", city, bucket: "review", updatedAt: ago(now, 2 * hour) },
    { id: garage, title: "West side garage studio", ownerName: "Noah Hale", city, bucket: "review", updatedAt: ago(now, 26 * hour) },
    { id: hillside, title: "Hillside one-bedroom", ownerName: "Lena Ortiz", city, bucket: "live", updatedAt: ago(now, 3 * day) },
    { id: courtyard, title: "Courtyard apartment", ownerName: "Elena Marsh", city, bucket: "live", updatedAt: ago(now, 6 * day) },
    { id: garden, title: "Garden suite", ownerName: "Andre Silva", city, bucket: "live", updatedAt: ago(now, 5 * hour) },
    { id: unfinished, title: "Unfinished loft", ownerName: "Sam Idris", city, bucket: "draft", updatedAt: ago(now, 4 * day) },
    { id: seasonal, title: "Seasonal cabin", ownerName: "Helen Cho", city, bucket: "paused", updatedAt: ago(now, 12 * day) },
  ];

  const leads: AdminLead[] = [
    {
      id: "c1000000-0000-4000-8000-000000000001",
      name: "Mira Chen",
      email: "mira.chen@example.net",
      phone: "541-555-0141",
      sourceLabel: "Letter (QR)",
      interestLabel: "List it myself",
      status: "new",
      notes: "",
    },
    {
      id: "c1000000-0000-4000-8000-000000000002",
      name: "Owen Blake",
      email: "owen.blake@example.net",
      phone: "541-555-0142",
      sourceLabel: "/owners",
      interestLabel: "Full management",
      status: "new",
      notes: "",
    },
    {
      id: "c1000000-0000-4000-8000-000000000003",
      name: "Helen Cho",
      email: "helen.cho@example.net",
      phone: null,
      sourceLabel: "/owners",
      interestLabel: "Not sure",
      status: "called",
      notes: "Left a voicemail on Tuesday.",
    },
    {
      id: "c1000000-0000-4000-8000-000000000004",
      name: "Andre Silva",
      email: "andre.silva@example.net",
      phone: "541-555-0144",
      sourceLabel: "Letter (QR)",
      interestLabel: "Full management",
      status: "signed",
      notes: "Agreement sent.",
    },
    {
      id: "c1000000-0000-4000-8000-000000000005",
      name: "Jules Park",
      email: "jules.park@example.net",
      phone: "541-555-0145",
      sourceLabel: "/owners",
      interestLabel: "List it myself",
      status: "not_interested",
      notes: "",
    },
    {
      id: "c1000000-0000-4000-8000-000000000006",
      name: "Robin Adeyemi",
      email: "robin.adeyemi@example.net",
      phone: "541-555-0146",
      sourceLabel: "/owners",
      interestLabel: "Not sure",
      status: "closed",
      notes: "Duplicate of an older note.",
    },
  ];

  const inquiries: AdminInquiry[] = [
    {
      id: "e1000000-0000-4000-8000-000000000001",
      name: "Casey Nguyen",
      listingTitle: "Garden suite",
      email: "casey.nguyen@example.net",
      phone: "541-555-0161",
      reply: "unreplied",
      receivedAt: ago(now, 30 * 60 * 1000),
    },
    {
      id: "e1000000-0000-4000-8000-000000000002",
      name: "Rowan Ellis",
      listingTitle: "Hillside one-bedroom",
      email: "rowan.ellis@example.net",
      phone: null,
      reply: "replied",
      receivedAt: ago(now, 3 * hour),
    },
    {
      id: "e1000000-0000-4000-8000-000000000003",
      name: "Sasha Patel",
      listingTitle: "Courtyard apartment",
      email: "sasha.patel@example.net",
      phone: "541-555-0163",
      reply: "unreplied",
      receivedAt: ago(now, 5 * hour),
    },
    {
      id: "e1000000-0000-4000-8000-000000000004",
      name: "Quinn Adler",
      listingTitle: "Garden suite",
      email: "quinn.adler@example.net",
      phone: "541-555-0164",
      reply: "replied",
      receivedAt: ago(now, 2 * day),
    },
  ];

  const users: AdminUser[] = [
    {
      id: "d1000000-0000-4000-8000-000000000001",
      name: "Elena Marsh",
      email: "elena.marsh@example.net",
      role: "owner",
      joinedAt: ago(now, 20 * hour),
      listingCount: 2,
      inquiryCount: 0,
    },
    {
      id: "d1000000-0000-4000-8000-000000000002",
      name: "Noah Hale",
      email: "noah.hale@example.net",
      role: "owner",
      joinedAt: ago(now, 40 * hour),
      listingCount: 1,
      inquiryCount: 0,
    },
    {
      id: "d1000000-0000-4000-8000-000000000003",
      name: "Lena Ortiz",
      email: "lena.ortiz@example.net",
      role: "owner",
      joinedAt: ago(now, 30 * day),
      listingCount: 1,
      inquiryCount: 1,
    },
    {
      id: "d1000000-0000-4000-8000-000000000004",
      name: "Casey Nguyen",
      email: "casey.nguyen@example.net",
      role: "renter",
      joinedAt: ago(now, 10 * hour),
      listingCount: 0,
      inquiryCount: 1,
    },
    {
      id: "d1000000-0000-4000-8000-000000000005",
      name: "Rowan Ellis",
      email: "rowan.ellis@example.net",
      role: "renter",
      joinedAt: ago(now, 45 * day),
      listingCount: 0,
      inquiryCount: 1,
    },
  ];

  const activity = composeActivity({
    inquiries: inquiries.map((row) => ({ id: row.id, title: row.listingTitle, at: row.receivedAt })),
    replies: [{ id: "reply-1", title: "Hillside one-bedroom", at: ago(now, 90 * 60 * 1000) }],
    submissions: reviews.map((row) => ({ id: row.id, name: shortName(row.ownerName), at: row.submittedAt })),
    letterLeads: [{ id: leads[0]!.id, at: ago(now, 4 * hour) }],
    owners: users.filter((user) => user.role === "owner" && now.getTime() - new Date(user.joinedAt).getTime() < 3 * day).map((user) => ({ id: user.id, at: user.joinedAt })),
    calendars: [{ id: garden, title: "Garden suite", at: ago(now, 5 * hour) }],
  });

  const weekMs = 7 * day;
  const newSignups = users.filter((user) => now.getTime() - new Date(user.joinedAt).getTime() < weekMs).length;

  return {
    staff: {
      name: staffName,
      email: staffEmail,
      initials: initials(staffName, staffEmail),
    },
    waiting: reviews.length,
    live: listings.filter((row) => row.bucket === "live").length,
    newLeads: leads.filter((lead) => lead.status === "new").length,
    letterLeads: leads.filter((lead) => lead.status === "new" && lead.sourceLabel === "Letter (QR)").length,
    inquiriesThisWeek: inquiries.filter((row) => now.getTime() - new Date(row.receivedAt).getTime() < weekMs).length,
    newSignups,
    queue: [...reviews].sort((a, b) => (a.submittedAt < b.submittedAt ? -1 : 1)),
    activity,
    leads,
    listings,
    inquiries,
    users,
  };
}
