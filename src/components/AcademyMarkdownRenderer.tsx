import React, { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface Props {
  content: string;
  className?: string;
  components?: Components;
}

/**
 * Shared safe Markdown presentation for Academy readers and previews.
 *
 * Markdown is parsed and sanitized, raw HTML is not enabled, and code remains
 * text. Caller-provided components may override presentation-only elements
 * (for example, course-reader heading IDs used by the private text anchors).
 */
const academyMarkdownComponents: Components = {
  h1: ({ children, node: _node, ...props }: any) => (
    <h1 {...props} className="mb-4 mt-8 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">{children}</h1>
  ),
  h2: ({ children, node: _node, ...props }: any) => (
    <h2 {...props} className="mb-3 mt-7 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">{children}</h2>
  ),
  h3: ({ children, node: _node, ...props }: any) => (
    <h3 {...props} className="mb-3 mt-6 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">{children}</h3>
  ),
  h4: ({ children, node: _node, ...props }: any) => (
    <h4 {...props} className="mb-2 mt-5 text-base font-semibold text-slate-900 dark:text-slate-50 sm:text-lg">{children}</h4>
  ),
  h5: ({ children, node: _node, ...props }: any) => (
    <h5 {...props} className="mb-2 mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">{children}</h5>
  ),
  h6: ({ children, node: _node, ...props }: any) => (
    <h6 {...props} className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">{children}</h6>
  ),
  p: ({ children, node: _node, ...props }: any) => (
    <p {...props} className="my-3 leading-7 text-slate-800 dark:text-slate-200">{children}</p>
  ),
  ul: ({ children, node: _node, ...props }: any) => (
    <ul {...props} className="my-3 list-disc space-y-1 pl-6 text-slate-800 dark:text-slate-200">{children}</ul>
  ),
  ol: ({ children, node: _node, ...props }: any) => (
    <ol {...props} className="my-3 list-decimal space-y-1 pl-6 text-slate-800 dark:text-slate-200">{children}</ol>
  ),
  li: ({ children, node: _node, ...props }: any) => (
    <li {...props} className="leading-7 text-slate-800 dark:text-slate-200">{children}</li>
  ),
  blockquote: ({ children, node: _node, ...props }: any) => (
    <blockquote {...props} className="my-4 border-l-4 border-slate-300 pl-4 text-slate-700 dark:border-slate-600 dark:text-slate-300">{children}</blockquote>
  ),
  a: ({ children, href, node: _node, ...props }: any) => {
    const opensExternalPage = typeof href === 'string' && /^https?:\/\//i.test(href);
    return (
      <a
        {...props}
        href={href}
        target={opensExternalPage ? '_blank' : undefined}
        rel={opensExternalPage ? 'noopener noreferrer' : undefined}
        className="text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200"
      >
        {children}
      </a>
    );
  },
  pre: ({ children, node: _node, ...props }: any) => (
    <pre {...props} className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">{children}</pre>
  ),
  code: ({ children, className, node: _node, ...props }: any) => (
    <code
      {...props}
      className={className
        ? `font-mono text-inherit ${className}`
        : 'rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.875em] text-slate-900 dark:bg-slate-800 dark:text-slate-100'}
    >
      {children}
    </code>
  ),
  table: ({ children, node: _node, ...props }: any) => (
    <div className="my-4 max-w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table {...props} className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children, node: _node, ...props }: any) => (
    <th {...props} className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">{children}</th>
  ),
  td: ({ children, node: _node, ...props }: any) => (
    <td {...props} className="border-t border-slate-200 px-3 py-2 align-top text-slate-800 dark:border-slate-700 dark:text-slate-200">{children}</td>
  ),
  hr: ({ node: _node, ...props }: any) => (
    <hr {...props} className="my-6 border-slate-200 dark:border-slate-700" />
  ),
  img: ({ alt }: any) => (
    <span role="note" className="inline-block rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      Externe Bilder werden in Academy-Materialien nicht geladen{alt ? ` (${alt})` : ''}.
    </span>
  )
};

export const AcademyMarkdownRenderer: React.FC<Props> = ({ content, className = '', components }) => {
  const mergedComponents = useMemo(
    () => ({ ...academyMarkdownComponents, ...components }),
    [components]
  );

  return (
    <div className={`academy-markdown-content min-w-0 text-base leading-relaxed text-slate-800 dark:text-slate-200 ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={mergedComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
