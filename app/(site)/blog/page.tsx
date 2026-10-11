import { BlogIndex, blogMetadata, suspended } from "@/components/content/pages";

export const metadata = blogMetadata();

export default function Page() {
  return suspended(<BlogIndex />);
}
