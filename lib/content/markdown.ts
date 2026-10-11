import type { PhrasingContent, Root, RootContent } from "mdast";
import { remark } from "remark";
import type { BlockNode, InlineNode } from "./types";

export function markdownBlocks(markdown: string): BlockNode[] {
  const tree = remark().parse(markdown) as Root;
  return tree.children.flatMap((node) => {
    const block = toBlock(node);
    return block ? [block] : [];
  });
}

function toBlock(node: RootContent): BlockNode | null {
  switch (node.type) {
    case "heading":
      return {
        type: "heading",
        depth: node.depth,
        children: inlineNodes(node.children),
      };
    case "paragraph":
      return { type: "paragraph", children: inlineNodes(node.children) };
    case "list":
      return {
        type: "list",
        ordered: Boolean(node.ordered),
        start: node.ordered ? (node.start ?? 1) : null,
        items: node.children.map((item) =>
          item.children.flatMap((child) => {
            const block = toBlock(child);
            return block ? [block] : [];
          }),
        ),
      };
    case "blockquote":
      return {
        type: "blockquote",
        children: node.children.flatMap((child) => {
          const block = toBlock(child);
          return block ? [block] : [];
        }),
      };
    case "code":
      return { type: "code", value: node.value };
    case "thematicBreak":
      return { type: "thematicBreak" };
    default:
      return null;
  }
}

function inlineNodes(nodes: PhrasingContent[]): InlineNode[] {
  return nodes.flatMap(toInline);
}

function toInline(node: PhrasingContent): InlineNode[] {
  switch (node.type) {
    case "text":
      return [{ type: "text", value: node.value }];
    case "strong":
      return [{ type: "strong", children: inlineNodes(node.children) }];
    case "emphasis":
      return [{ type: "emphasis", children: inlineNodes(node.children) }];
    case "link":
      return [{ type: "link", url: node.url, children: inlineNodes(node.children) }];
    case "break":
      return [{ type: "break" }];
    case "inlineCode":
      return [{ type: "text", value: node.value }];
    case "image":
      return node.alt ? [{ type: "text", value: node.alt }] : [];
    case "html":
      return [{ type: "text", value: node.value }];
    default: {
      const fallback = node as { value?: unknown; children?: PhrasingContent[] };
      if (typeof fallback.value === "string") return [{ type: "text", value: fallback.value }];
      if (fallback.children) return inlineNodes(fallback.children);
      return [];
    }
  }
}
