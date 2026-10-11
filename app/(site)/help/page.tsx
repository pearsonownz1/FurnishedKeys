import { GuidePage, guideMetadata, suspended } from "@/components/content/pages";

export async function generateMetadata() {
  return guideMetadata("help", "/help");
}

export default function Page() {
  return suspended(<GuidePage id="help" path="/help" />);
}
