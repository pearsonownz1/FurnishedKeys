import Link from "next/link";
import type { ReactNode } from "react";
import { externalLinkRel } from "@/lib/content/text";
import type { InlineNode } from "@/lib/content/types";

export function Inlines({ nodes }: { nodes: InlineNode[] }) {
  return nodes.map((node, index) => <Inline key={index} node={node} />);
}

function Inline({ node }: { node: InlineNode }) {
  if (node.type === "text") return node.value;
  if (node.type === "break") return <br />;
  if (node.type === "strong") {
    return (
      <strong className="font-semibold">
        <Inlines nodes={node.children} />
      </strong>
    );
  }
  if (node.type === "emphasis") {
    return (
      <em>
        <Inlines nodes={node.children} />
      </em>
    );
  }
  return <MdLink url={node.url}>{<Inlines nodes={node.children} />}</MdLink>;
}

function MdLink({ url, children }: { url: string; children: ReactNode }) {
  const className = "font-semibold text-pine";
  if (url.startsWith("/")) {
    return (
      <Link href={url} className={className}>
        {children}
      </Link>
    );
  }
  const rel = externalLinkRel(url);
  return (
    <a href={url} className={className} {...(rel ? { rel, target: "_blank" } : {})}>
      {children}
    </a>
  );
}
