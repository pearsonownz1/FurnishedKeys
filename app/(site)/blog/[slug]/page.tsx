import { PostPage, postPageMetadata, postStaticParams, suspended } from "@/components/content/pages";

export function generateStaticParams() {
  return postStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return postPageMetadata(slug);
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return suspended(<PostPage params={params} />);
}
