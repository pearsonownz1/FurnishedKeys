export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "emphasis"; children: InlineNode[] }
  | { type: "link"; url: string; children: InlineNode[] }
  | { type: "break" };

export type BlockNode =
  | { type: "heading"; depth: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "list"; ordered: boolean; start: number | null; items: BlockNode[][] }
  | { type: "blockquote"; children: BlockNode[] }
  | { type: "code"; value: string }
  | { type: "thematicBreak" };

export type Post = {
  title: string;
  description: string;
  slug: string;
  category: string;
  categorySlug: string;
  date: string;
  modified: string;
  author: string;
  body: string;
  blocks: BlockNode[];
  readingMinutes: number;
};

export type Category = {
  name: string;
  slug: string;
  posts: Post[];
};

export type ContentPageId = "faq" | "help" | "renters" | "landlords";

export type ContentPage = {
  id: ContentPageId;
  title: string;
  description: string;
  body: string;
  blocks: BlockNode[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqSection = {
  heading: string;
  items: FaqItem[];
  notes: string[];
};

export type FaqDocument = {
  title: string;
  sections: FaqSection[];
};
