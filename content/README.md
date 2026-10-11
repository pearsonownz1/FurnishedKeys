# Content

Page copy and the blog live in this folder. The site reads the files when it builds. Adding a page or a post does not require a new route.

## New blog post

Add a Markdown file in `content/blog/`. The filename can be anything ending in `.md`. The public URL comes from `slug` in the frontmatter.

```yaml
---
title: Post title
description: One or two sentences used as the meta description and the card excerpt.
slug: my-new-post
category: Renters
date: 2026-10-11
author: Furnished Keys Team
---

The opening paragraph is the lead, under the title. The title is not repeated as a heading.

## Section

Section headings become the hairline sections on the post page.
```

Required frontmatter:

- `title` and `description` — the title tag and meta description, used as written. Quote a title that contains a colon so the words stay the same
- `slug` — lowercase words separated by hyphens. This becomes `/blog/<slug>`. Do not use `category` or `rss.xml`
- `category` — a category page is created at `/blog/category/<slug>` for every category that appears on at least one post. Current posts use `Renters`, `Landlords`, and `Central Oregon`
- `date` — `YYYY-MM-DD`
- `updated` — optional `YYYY-MM-DD`. When present, this is `dateModified` in the article data and the sitemap. Otherwise the publish date is used
- `author` — shown on the post and in the article structured data

After the file is committed, the post, its category, the sitemap, the RSS feed at `/blog/rss.xml`, and the Open Graph image are generated with the rest of the site.

Landlord posts end with a link to list a property. Other posts end with a link to find a home.

## Other pages

| File | URL |
| --- | --- |
| `content/faq.md` | `/faq` |
| `content/help-center.md` | `/help` |
| `content/resources-renters.md` | `/resources/renters` |
| `content/resources-landlords.md` | `/resources/landlords` |

Each of those files needs `title` and `description` frontmatter. Those values are the SEO title and meta description. The first heading in the file is the page heading.

`nav-and-footer.md` is the navigation spec. It is not a page.
