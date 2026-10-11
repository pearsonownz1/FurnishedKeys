import { redirect } from "next/navigation";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Your listings",
  description: "Live, in review, and draft listings for your account.",
  ...canonical("/owner"),
};

export default function OwnerPage() {
  redirect("/owner/listings");
}
