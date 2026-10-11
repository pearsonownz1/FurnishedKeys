import type { InquiryThreadMessage } from "@/lib/owner-dashboard";

export function InquiryThread({ messages }: { messages: InquiryThreadMessage[] }) {
  return (
    <ol className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-bg p-4 md:p-6">
      {messages.map((message) => {
        const mine = message.from === "owner";
        return (
          <li
            key={message.id}
            className={
              mine
                ? "max-w-[62%] self-end border border-pine bg-pine px-3.5 py-3 text-white"
                : "max-w-[62%] self-start border border-line bg-white px-3.5 py-3"
            }
          >
            <p className="whitespace-pre-wrap">{message.body}</p>
            <small className={mine ? "mt-1.5 block text-[11px] text-white/70" : "mt-1.5 block text-[11px] text-muted"}>
              {message.name} · {message.timeLabel}
              {message.emailed ? " · emailed" : ""}
            </small>
          </li>
        );
      })}
    </ol>
  );
}
