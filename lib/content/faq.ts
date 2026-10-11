import { markdownBlocks } from "./markdown";
import { inlinePlain } from "./text";
import type { FaqDocument, FaqItem, InlineNode } from "./types";

function questionAnswer(children: InlineNode[]): { question: string; answer: string } | null {
  const [first, ...rest] = children;
  if (!first || first.type !== "strong") return null;
  const question = inlinePlain(first.children).trim();
  const answer = inlinePlain(rest).trim();
  if (!question || !answer) return null;
  return { question, answer };
}

export function parseFaq(markdown: string): FaqDocument {
  const blocks = markdownBlocks(markdown);
  let title = "";
  const sections: FaqDocument["sections"] = [];
  let current: FaqDocument["sections"][number] | null = null;

  for (const block of blocks) {
    if (block.type === "heading" && block.depth === 1) {
      title = inlinePlain(block.children).trim();
      continue;
    }
    if (block.type === "heading" && block.depth === 2) {
      current = { heading: inlinePlain(block.children).trim(), items: [], notes: [] };
      sections.push(current);
      continue;
    }
    if (!current || block.type !== "paragraph") continue;
    const pair = questionAnswer(block.children);
    if (pair) current.items.push(pair);
    else {
      const note = inlinePlain(block.children).trim();
      if (note) current.notes.push(note);
    }
  }

  if (!title) throw new Error("FAQ is missing a heading");
  return { title, sections };
}

export function faqItems(document: FaqDocument): FaqItem[] {
  return document.sections.flatMap((section) => section.items);
}

export function faqPageJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
