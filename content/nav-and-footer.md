# Resources dropdown and footer (for Front End)

## Header: "Resources" dropdown
- Renter Resources → /resources/renters
- Landlord Resources → /resources/landlords
- Help Center → /help
- Blog → /blog
- FAQs → /faq

## Footer
Three link columns:
- **Company:** About Us (/about), Contact Us (mailto:hello@furnishedkeys.com until a /contact page exists; /contact is a 404 today), Management (/management)
- **Resources:** FAQs (/faq), Blog (/blog), Help Center (/help)
- **Get started:** Find a Home (/rentals), List Your Property (/owners), Sign In (/sign-in)

Bottom bar: "© 2026 Furnished Keys · Central Oregon · hello@furnishedkeys.com", then Terms of Use (/terms) and Privacy Policy (/privacy).
Don't add a mailing address or phone number until Guy gives one. /terms and /privacy are 404s today, so leave them out until real pages exist.

## Blog SEO checklist (what a WordPress SEO plugin would give us)
- A unique title tag and meta description on every post, taken from its frontmatter
- A canonical URL at https://www.furnishedkeys.com/blog/<slug>
- Article structured data (JSON-LD) with headline, datePublished, dateModified, author and image
- FAQPage structured data on /faq
- Posts added to sitemap.xml, plus an RSS feed at /blog/rss.xml
- An Open Graph and Twitter card image for every post
- A category page for each category: Renters, Landlords, Central Oregon
- Breadcrumbs (Blog › Category › Post) with BreadcrumbList structured data
- A "List your property" or "Find a home" call to action at the end of each post, chosen by category
