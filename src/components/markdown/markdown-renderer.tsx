"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import type { PluggableList } from "unified";
import { sanitizeSchema } from "@/lib/markdown/sanitize-schema";

// Module-scope arrays so React doesn't see new references on each render
const remarkPlugins: PluggableList = [remarkGfm, remarkBreaks];
const rehypePlugins: PluggableList = [
  [rehypeSanitize, sanitizeSchema],
  rehypeSlug,
  rehypeHighlight,
];

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-zinc max-w-none prose-headings:scroll-mt-20 prose-a:text-brand-700 prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.9em] prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-[#0d1117] prose-pre:p-0">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
