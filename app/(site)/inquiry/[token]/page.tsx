import { connection } from "next/server";
import { Suspense } from "react";
import { RenterReplyForm } from "@/components/inquiry/renter-reply-form";
import { loadRenterThread } from "@/lib/renter-thread";

export const metadata = {
  title: "Your inquiry",
  robots: { index: false, follow: false },
};

const expired = "This link has expired. Open the newest email from the owner.";

export default function InquiryThreadPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Thread params={params} />
    </Suspense>
  );
}

async function Thread({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const thread = await loadRenterThread(token);

  if (!thread) {
    return (
      <div className="shell max-w-3xl py-14 lg:py-20">
        <p className="text-sm text-muted">{expired}</p>
      </div>
    );
  }

  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <h1 className="font-serif text-4xl leading-none font-normal">{thread.listingTitle}</h1>
      <article className="mt-8 max-w-xl border border-line bg-surface px-4 py-4">
        <p className="text-xs tracking-[0.12em] text-muted uppercase">Your inquiry</p>
        <p className="mt-2 whitespace-pre-wrap text-[15px]">{thread.inquiryMessage}</p>
      </article>
      <ol className="mt-4 max-w-xl space-y-3">
        {thread.messages.map((message) => (
          <li key={message.id} className="border border-line bg-surface px-4 py-4">
            <p className="text-xs tracking-[0.12em] text-muted uppercase">
              {message.sender_role === "owner" ? "Owner" : "You"}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[15px]">{message.body}</p>
          </li>
        ))}
      </ol>
      <RenterReplyForm token={token} />
    </div>
  );
}
