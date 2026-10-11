import { GuidePage, guideMetadata, suspended } from "@/components/content/pages";

export async function generateMetadata() {
  return guideMetadata("renters", "/resources/renters");
}

export default function Page() {
  return suspended(<GuidePage id="renters" path="/resources/renters" />);
}
