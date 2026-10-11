import { inlinePlain } from "@/lib/content/text";
import type { BlockNode, InlineNode } from "@/lib/content/types";
import { Inlines } from "./inlines";

export function splitArticle(blocks: BlockNode[]): {
  lead: BlockNode[];
  sections: { heading: InlineNode[]; blocks: BlockNode[] }[];
} {
  const lead: BlockNode[] = [];
  const sections: { heading: InlineNode[]; blocks: BlockNode[] }[] = [];
  let current: (typeof sections)[number] | null = null;

  for (const block of blocks) {
    if (block.type === "heading" && block.depth === 1) continue;
    if (block.type === "heading" && block.depth === 2) {
      current = { heading: block.children, blocks: [] };
      sections.push(current);
      continue;
    }
    if (current) current.blocks.push(block);
    else lead.push(block);
  }

  return { lead, sections };
}

export function MarkdownBlocks({ blocks, compact = false }: { blocks: BlockNode[]; compact?: boolean }) {
  return blocks.map((block, index) => <Block key={index} block={block} compact={compact} />);
}

function Block({ block, compact }: { block: BlockNode; compact: boolean }) {
  if (block.type === "heading") {
    if (block.depth === 3) {
      return (
        <h3 className="mt-8 font-serif text-2xl leading-tight font-normal tracking-[-0.3px]">
          <Inlines nodes={block.children} />
        </h3>
      );
    }
    return (
      <h2 className="mt-10 border-t border-line pt-6 font-serif text-[clamp(1.75rem,3vw,2.25rem)] leading-tight font-normal tracking-[-0.4px]">
        <Inlines nodes={block.children} />
      </h2>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p className={compact ? "text-[15px] leading-relaxed first:mt-0 [&:not(:first-child)]:mt-2" : "mt-4 text-[17px] leading-relaxed first:mt-0"}>
        <Inlines nodes={block.children} />
      </p>
    );
  }

  if (block.type === "list" && block.ordered) {
    return (
      <ol start={block.start ?? undefined} className="mt-4 list-decimal space-y-3 pl-5 text-[17px] leading-relaxed first:mt-0">
        {block.items.map((item, index) => (
          <li key={index}>
            <MarkdownBlocks blocks={item} compact />
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "list") {
    return (
      <ul className="mt-4 first:mt-0">
        {block.items.map((item, index) => (
          <li key={index} className="flex items-start gap-3 border-t border-line py-3 text-[15px] leading-relaxed">
            <span aria-hidden="true" className="mt-[0.7em] h-px w-2.5 shrink-0 bg-pine" />
            <div className="min-w-0">
              <MarkdownBlocks blocks={item} compact />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote className="mt-4 border-l border-pine pl-4 text-[17px] leading-relaxed">
        <MarkdownBlocks blocks={block.children} />
      </blockquote>
    );
  }

  if (block.type === "code") {
    return <pre className="mt-4 overflow-x-auto bg-stone p-4 text-sm">{block.value}</pre>;
  }

  return <hr className="mt-8 border-line" />;
}

export function ArticleSections({ blocks }: { blocks: BlockNode[] }) {
  const { sections } = splitArticle(blocks);
  return sections.map((section, index) => (
    <section key={`${inlinePlain(section.heading)}-${index}`} className="border-t border-line">
      <div className="shell grid gap-8 py-14 md:py-16 lg:grid-cols-[420px_minmax(0,1fr)] lg:py-20">
        <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-normal tracking-[-0.6px]">
          <Inlines nodes={section.heading} />
        </h2>
        <div className="max-w-[40rem]">
          <MarkdownBlocks blocks={section.blocks} />
        </div>
      </div>
    </section>
  ));
}
