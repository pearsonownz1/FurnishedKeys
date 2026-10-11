import { HomePage } from "@/components/home-page";
import { canonical } from "@/lib/site";

export const metadata = {
  ...canonical("/"),
};

export default function Home() {
  return <HomePage />;
}
