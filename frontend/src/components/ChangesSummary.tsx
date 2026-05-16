import { useState, type ReactNode } from "react";

interface Props {
  markdown: string;
}

/**
 * Minimal markdown renderer tailored for the changes_summary block.
 * Handles: `## heading`, `- bullet`, blank lines, and inline `**bold**` / `*italic*`.
 * Everything else is rendered as a paragraph.
 */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Split by **bold** and *italic*, preserving the delimiters
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const tok = match[0];
    if (tok.startsWith("**") && tok.endsWith("**")) {
      parts.push(
        <strong key={`b${key++}`} className="font-semibold text-indigo-800">
          {tok.slice(2, -2)}
        </strong>
      );
    } else if (tok.startsWith("`") && tok.endsWith("`")) {
      parts.push(
        <code key={`c${key++}`} className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("*") && tok.endsWith("*")) {
      parts.push(<em key={`i${key++}`}>{tok.slice(1, -1)}</em>);
    } else {
      parts.push(tok);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderBlocks(md: string): ReactNode[] {
  const lines = md.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h3 key={`h${key++}`} className="text-base font-bold text-slate-900 mt-5 mb-2 flex items-center gap-2">
          <span className="inline-block w-1 h-5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded" />
          {line.slice(3)}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        const text = lines[i].trim().slice(2);
        items.push(
          <li key={`li${key++}`} className="text-base text-slate-700 leading-relaxed pl-1">
            {renderInline(text)}
          </li>
        );
        i++;
      }
      blocks.push(
        <ul key={`ul${key++}`} className="list-disc pl-6 space-y-1.5 marker:text-indigo-500">
          {items}
        </ul>
      );
      continue;
    }

    // Paragraph: a single non-heading, non-bullet line
    blocks.push(
      <p key={`p${key++}`} className="text-base text-slate-700 leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return blocks;
}

export default function ChangesSummary({ markdown }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore — older browsers
    }
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-200 rounded-xl shadow-md overflow-hidden">
      <div className="px-5 py-3 border-b border-indigo-100 bg-white/60 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          📝 Changes summary
        </h2>
        <button
          onClick={handleCopy}
          className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition ${
            copied
              ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
              : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
          }`}
        >
          {copied ? "✓ Copied!" : "📋 Copy"}
        </button>
      </div>
      <div className="px-6 py-4 space-y-1">{renderBlocks(markdown)}</div>
    </div>
  );
}
