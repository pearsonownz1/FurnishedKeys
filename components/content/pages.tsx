import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { ContentCover } from "@/components/content/cover";
import { ArticleSections, MarkdownBlocks, splitArticle } from "@/components/content/markdown-body";
import { Breadcrumbs } from "@/components/content/breadcrumbs";
import { JsonLd } from "@/components/content/json-ld";
import { PostList } from "@/components/content/post-card";
import { getCategories, getCategory, getContentPage, getFaq, getPost, getPosts, relatedPosts } from "@/lib/content/load";
import { faqItems, faqPageJsonLd } from "@/lib/content/faq";
import { articleJsonLd, blogIndexMetadata, breadcrumbJsonLd, pageMetadata, postMetadata } from "@/lib/content/seo";
import { formatPostDate, inlinePlain, postCallToAction } from "@/lib/content/text";
import type { BlockNode, ContentPageId } from "@/lib/content/types";
import Link from "next/link";

function pageHeading(blocks: BlockNode[], fallback: string): string {
  const heading = blocks.find((block) => block.type === "heading" && block.depth === 1);
  if (heading && heading.type === "heading") return inlinePlain(heading.children).trim() || fallback;
  return fallback;
}

function Note({ text }: { text: string }) {
  const parts = text.split(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  return (
    <p className="text-[17px] leading-relaxed">
      {parts.map((part, index) =>
        part.includes("@") ? (
          <a key={index} href={`mailto:${part}`} className="font-semibold text-pine">
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

export async function guideMetadata(id: ContentPageId, path: string) {
  const page = await getContentPage(id);
  return pageMetadata({ title: page.title, description: page.description, path, cover: page.cover });
}

export async function GuidePage({ id, path }: { id: ContentPageId; path: string }) {
  const page = await getContentPage(id);
  const heading = pageHeading(page.blocks, page.title);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: heading, path },
  ];
  const { lead } = splitArticle(page.blocks);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <section className="shell py-16 lg:py-20">
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-6 max-w-3xl font-serif text-[clamp(2.5rem,6vw,4.25rem)] leading-[0.98] font-normal tracking-[-1px]">
          {heading}
        </h1>
        <div className="mt-8">
          <ContentCover cover={page.cover} priority bordered sizes="(min-width: 1024px) 1128px, 100vw" />
        </div>
        {lead.length > 0 ? (
          <div className="mt-6 max-w-[40rem]">
            <MarkdownBlocks blocks={lead} />
          </div>
        ) : null}
      </section>
      <ArticleSections blocks={page.blocks} />
    </>
  );
}

export function blogMetadata() {
  return blogIndexMetadata();
}

export async function BlogIndex() {
  const posts = await getPosts();
  return (
    <div>
      <section className="shell py-16 lg:py-24">
        <h1 className="max-w-[12ch] font-serif text-[clamp(2.75rem,6vw,4.5rem)] leading-[0.98] font-normal tracking-[-1px]">
          Blog
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed">
          Guides for renters and owners of furnished monthly rentals.
        </p>
      </section>
      <section className="border-t border-line">
        <div className="shell py-14 lg:py-16">
          {posts.length > 0 ? <PostList posts={posts} /> : <p className="text-muted">No posts yet.</p>}
        </div>
      </section>
    </div>
  );
}

export async function categoryStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function categoryMetadata(slug: string) {
  const category = await getCategory(slug);
  if (!category) return {};
  return pageMetadata({
    title: `${category.name} | Furnished Keys`,
    description: `Guides filed under ${category.name}.`,
    path: `/blog/category/${category.slug}`,
  });
}

export async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const crumbs = [
    { name: "Blog", path: "/blog" },
    { name: category.name, path: `/blog/category/${category.slug}` },
  ];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <section className="shell py-16 lg:py-20">
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-6 font-serif text-[clamp(2.75rem,6vw,4.5rem)] leading-[0.98] font-normal tracking-[-1px]">
          {category.name}
        </h1>
      </section>
      <section className="border-t border-line">
        <div className="shell py-14 lg:py-16">
          <PostList posts={category.posts} />
        </div>
      </section>
    </>
  );
}

export async function postStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function postPageMetadata(slug: string) {
  const post = await getPost(slug);
  if (!post) return {};
  return postMetadata(post);
}

export async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const posts = await getPosts();
  const related = relatedPosts(posts, post);
  const crumbs = [
    { name: "Blog", path: "/blog" },
    { name: post.category, path: `/blog/category/${post.categorySlug}` },
    { name: post.title, path: `/blog/${post.slug}` },
  ];
  const action = postCallToAction(post.category);
  const { lead } = splitArticle(post.blocks);

  return (
    <>
      <JsonLd data={articleJsonLd(post)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <article>
        <header className="shell py-16 lg:py-20">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-6 max-w-3xl font-serif text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-normal tracking-[-0.8px]">
            {post.title}
          </h1>
          <p className="mt-5 text-sm text-muted">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span aria-hidden="true"> · </span>
            {post.readingMinutes} min read
            <span aria-hidden="true"> · </span>
            {post.author}
          </p>
          <div className="mt-8">
            <ContentCover cover={post.cover} priority bordered sizes="(min-width: 1024px) 1128px, 100vw" />
          </div>
          {lead.length > 0 ? (
            <div className="mt-8 max-w-[40rem]">
              <MarkdownBlocks blocks={lead} />
            </div>
          ) : null}
        </header>
        <ArticleSections blocks={post.blocks} />
      </article>
      {related.length > 0 ? (
        <section className="border-t border-line">
          <div className="shell py-14 lg:py-16">
            <h2 className="font-serif text-[clamp(2rem,4vw,2.75rem)] leading-tight font-normal tracking-[-0.5px]">
              More in {post.category}
            </h2>
            <ul className="mt-8 border-t border-line">
              {related.map((item) => (
                <li key={item.slug} className="border-b border-line">
                  <Link href={`/blog/${item.slug}`} className="block py-5 hover:text-pine">
                    <span className="text-[17px] font-semibold">{item.title}</span>
                    <span className="mt-1 block text-sm text-muted">
                      <time dateTime={item.date}>{formatPostDate(item.date)}</time>
                      <span aria-hidden="true"> · </span>
                      {item.readingMinutes} min read
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      <section className="border-t border-line bg-stone">
        <div className="shell flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between lg:py-16">
          <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-tight font-normal tracking-[-0.5px]">
            {action.label}
          </h2>
          <Link href={action.href} className="rounded-[2px] bg-pine px-5 py-3.5 text-[15px] font-semibold text-white">
            {action.label}
          </Link>
        </div>
      </section>
    </>
  );
}

export async function faqMetadata() {
  const faq = await getFaq();
  return pageMetadata({ title: faq.seoTitle, description: faq.description, path: "/faq", cover: faq.cover });
}

export async function FaqPage() {
  const faq = await getFaq();
  const items = faqItems(faq);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: faq.title, path: "/faq" },
  ];

  return (
    <>
      <JsonLd data={faqPageJsonLd(items)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <section className="shell py-16 lg:py-20">
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-6 max-w-[14ch] font-serif text-[clamp(2.75rem,6vw,4.5rem)] leading-[0.98] font-normal tracking-[-1px]">
          {faq.title}
        </h1>
        <div className="mt-8">
          <ContentCover cover={faq.cover} priority bordered sizes="(min-width: 1024px) 1128px, 100vw" />
        </div>
      </section>
      {faq.sections.map((section) => (
        <section key={section.heading} className="border-t border-line">
          <div className="shell grid gap-8 py-14 md:py-16 lg:grid-cols-[420px_minmax(0,1fr)] lg:py-20">
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-normal tracking-[-0.6px]">
              {section.heading}
            </h2>
            <div className="max-w-[40rem]">
              {section.items.length > 0 ? (
                <div className="border-b border-line">
                  {section.items.map((item) => (
                    <details key={item.question} className="group border-t border-line">
                      <summary className="flex cursor-pointer items-start justify-between gap-4 py-4 text-[17px] font-semibold">
                        <span>{item.question}</span>
                        <span
                          aria-hidden="true"
                          className="mt-1 text-xl leading-none text-muted transition-transform group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="pb-5 text-[17px] leading-relaxed">{item.answer}</p>
                    </details>
                  ))}
                </div>
              ) : null}
              {section.notes.length > 0 ? (
                <div className={section.items.length > 0 ? "mt-6" : undefined}>
                  {section.notes.map((note) => (
                    <Note key={note} text={note} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

export function suspended(node: ReactNode) {
  return <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>{node}</Suspense>;
}
