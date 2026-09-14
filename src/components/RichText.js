// Renders the light markup used for editable page text:
//   ## Heading        -> <h2>
//   - item            -> <ul><li>
//   [img:/path|alt]   -> a figure
//   blank line        -> new paragraph
// Emails and links in the text become clickable. Deliberately not full
// Markdown: this is what club volunteers need, and nothing an admin types
// can inject HTML, because it is all rendered as React text.

const LINKABLE = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;

function Inline({ text }) {
  const parts = String(text).split(LINKABLE);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-ibc-blue underline">
          {part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
        </a>
      );
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)) {
      return (
        <a key={i} href={`mailto:${part}`} className="text-ibc-blue underline">
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function RichText({ text, className = "" }) {
  const blocks = String(text || "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const out = [];
  let list = [];
  const flushList = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="my-4 list-disc space-y-1.5 pl-6">
          {list.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.every((l) => /^-\s+/.test(l))) {
      list.push(...lines.map((l) => l.replace(/^-\s+/, "")));
      continue;
    }
    flushList();
    const img = /^\[img:([^|\]]+)\|?([^\]]*)\]$/.exec(block);
    if (img) {
      out.push(
        <figure key={`img-${out.length}`} className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img[1]} alt={img[2] || ""} loading="lazy" decoding="async" className="w-full rounded-xl object-cover" />
        </figure>
      );
    } else if (/^##\s+/.test(block)) {
      out.push(
        <h2 key={`h-${out.length}`} className="mt-8 font-display text-xl font-bold uppercase text-ibc-blue">
          {block.replace(/^##\s+/, "")}
        </h2>
      );
    } else {
      out.push(
        <p key={`p-${out.length}`} className="my-3 whitespace-pre-line">
          <Inline text={block} />
        </p>
      );
    }
  }
  flushList();
  return <div className={`leading-relaxed text-ibc-ink/85 ${className}`}>{out}</div>;
}
