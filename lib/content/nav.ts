export const resourceLinks = [
  { href: "/resources/renters", label: "Renter Resources" },
  { href: "/resources/landlords", label: "Landlord Resources" },
  { href: "/help", label: "Help Center" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQs" },
] as const;

export const footerColumns = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "mailto:hello@furnishedkeys.com", label: "Contact Us" },
      { href: "/management", label: "Management" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/faq", label: "FAQs" },
      { href: "/blog", label: "Blog" },
      { href: "/help", label: "Help Center" },
    ],
  },
  {
    title: "Get started",
    links: [
      { href: "/rentals", label: "Find a Home" },
      { href: "/owners", label: "List Your Property" },
      { href: "/sign-in", label: "Sign In" },
    ],
  },
] as const;

export function isResourcePath(pathname: string): boolean {
  return resourceLinks.some(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  );
}
