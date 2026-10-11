import { GuidePage, guideMetadata, suspended } from "@/components/content/pages";

export async function generateMetadata() {
  return guideMetadata("landlords", "/resources/landlords");
}

export default function Page() {
  return suspended(<GuidePage id="landlords" path="/resources/landlords" />);
}
