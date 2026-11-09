import type { ReactNode } from "react";

/**
 * Small markdown renderer for generated suggestions. It intentionally supports
 * only the subset the prompts produce: headings, paragraphs, bullet/numbered
 * lists, bold text and horizontal rules.
 */
export function MaterialMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={blocks.length} className="text-sm leading-relaxed">
        {inline(paragraph.join(" "))}
      </p>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const className =
      "space-y-1 pl-5 text-sm leading-relaxed " +
      (list.ordered ? "list-decimal" : "list-disc");
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length} className={className}>
          {list.items.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul key={blocks.length} className={className}>
          {list.items.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ul>
      ),
    );
    list = null;
  };

  const flush = () => {
    flushParagraph();
    flushList();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    if (line === "---") {
      flush();
      blocks.push(
        <hr key={blocks.length} className="border-border" />,
      );
      continue;
    }

    if (line.startsWith("# ")) {
      flush();
      blocks.push(
        <h2 key={blocks.length} className="text-lg font-semibold tracking-tight">
          {inline(line.slice(2))}
        </h2>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      flush();
      blocks.push(
        <h3
          key={blocks.length}
          className="mt-4 text-sm font-semibold tracking-tight"
        >
          {inline(line.slice(3))}
        </h3>,
      );
      continue;
    }

    if (line.startsWith("### ")) {
      flush();
      blocks.push(
        <h4
          key={blocks.length}
          className="mt-3 text-sm font-medium leading-relaxed"
        >
          {inline(line.slice(4))}
        </h4>,
      );
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flush();

  return <div className="space-y-2.5">{blocks}</div>;
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}
