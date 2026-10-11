import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function LegacyAdminListingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Go params={params} />
    </Suspense>
  );
}

async function Go({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  return redirect(`/admin/review?id=${encodeURIComponent(id)}`);
}
