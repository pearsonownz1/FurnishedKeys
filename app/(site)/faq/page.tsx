import { FaqPage, faqMetadata, suspended } from "@/components/content/pages";

export async function generateMetadata() {
  return faqMetadata();
}

export default function Page() {
  return suspended(<FaqPage />);
}
