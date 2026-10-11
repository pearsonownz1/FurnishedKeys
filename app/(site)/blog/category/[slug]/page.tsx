import { CategoryPage, categoryMetadata, categoryStaticParams, suspended } from "@/components/content/pages";

export function generateStaticParams() {
  return categoryStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return categoryMetadata(slug);
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return suspended(<CategoryPage params={params} />);
}
