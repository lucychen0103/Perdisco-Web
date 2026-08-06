import { useMemo } from "react";

/**
 * Web port of the consumer app's RichText (src/components/RichText.tsx) so the
 * composer preview renders prose exactly as the app does. Editorial prose is
 * markdown-flavoured plain text; the inline subset — **bold**, *italic* /
 * _italic_, and [label](https://…) links — becomes nested serif spans. Block
 * syntax (headings, lists) is not interpreted; it stays literal so bad input
 * degrades to readable text instead of disappearing.
 *
 * Links only open http(s) URLs (new tab here, Linking.openURL in the app). On
 * pressable rows and cards pass `links={false}` so a link renders as plain
 * label text and the row keeps the tap.
 */

type InlineSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  url?: string;
};

type SpanFlags = Omit<InlineSpan, "text">;

type Token = { start: number; end: number; inner: string; flags: SpanFlags };

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/;

/**
 * CommonMark-style guard: emphasis content may not start or end with
 * whitespace, so stray markers ("a ** b") stay literal instead of pairing
 * with an unrelated marker later in the paragraph.
 */
const validInner = (inner: string) => inner.length > 0 && inner.trim() === inner;

function matchLink(text: string): Token | null {
  const match = LINK_RE.exec(text);
  if (!match) return null;
  return {
    start: match.index,
    end: match.index + match[0].length,
    inner: match[1],
    flags: { url: match[2] },
  };
}

function matchDelimited(
  text: string,
  delim: string,
  flags: SpanFlags,
): Token | null {
  let from = 0;
  while (true) {
    const start = text.indexOf(delim, from);
    if (start === -1) return null;
    const close = text.indexOf(delim, start + delim.length);
    if (close === -1) return null;
    const inner = text.slice(start + delim.length, close);
    if (validInner(inner)) {
      return { start, end: close + delim.length, inner, flags };
    }
    from = start + delim.length;
  }
}

const isWordChar = (char: string) => /[A-Za-z0-9]/.test(char);

/** Underscore emphasis only at word edges, so snake_case stays literal. */
function matchUnderscore(text: string): Token | null {
  let from = 0;
  while (true) {
    const start = text.indexOf("_", from);
    if (start === -1) return null;
    const close = text.indexOf("_", start + 1);
    if (close === -1) return null;
    const inner = text.slice(start + 1, close);
    const before = start > 0 ? text[start - 1] : " ";
    const after = close + 1 < text.length ? text[close + 1] : " ";
    if (validInner(inner) && !isWordChar(before) && !isWordChar(after)) {
      return { start, end: close + 1, inner, flags: { italic: true } };
    }
    from = start + 1;
  }
}

function nextToken(text: string): Token | null {
  let best: Token | null = null;
  for (const candidate of [
    matchLink(text),
    matchDelimited(text, "**", { bold: true }),
    matchDelimited(text, "*", { italic: true }),
    matchUnderscore(text),
  ]) {
    if (candidate && (!best || candidate.start < best.start)) best = candidate;
  }
  return best;
}

function parseSegment(text: string, base: SpanFlags): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let remaining = text;
  while (remaining.length) {
    const token = nextToken(remaining);
    if (!token) {
      spans.push({ ...base, text: remaining });
      break;
    }
    if (token.start > 0) {
      spans.push({ ...base, text: remaining.slice(0, token.start) });
    }
    spans.push(...parseSegment(token.inner, { ...base, ...token.flags }));
    remaining = remaining.slice(token.end);
  }
  return spans;
}

export function parseInlineMarkdown(text: string): InlineSpan[] {
  return parseSegment(text, {});
}

/** Markdown stripped to its visible text, for a11y labels and search. */
export function plainText(text: string): string {
  return parseInlineMarkdown(text)
    .map((span) => span.text)
    .join("");
}

export function RichText({
  children,
  links = true,
  linkColor = "var(--champagne)",
}: {
  children: string;
  links?: boolean;
  linkColor?: string;
}) {
  const spans = useMemo(() => parseInlineMarkdown(children), [children]);

  if (spans.length === 1 && !spans[0].bold && !spans[0].italic && !spans[0].url) {
    return <>{spans[0].text}</>;
  }

  return (
    <>
      {spans.map((span, index) => {
        // Bold wins over italic when nested, matching the app's font choice
        // (Newsreader_600SemiBold has no italic face).
        const style: React.CSSProperties = {
          fontWeight: span.bold ? 600 : undefined,
          fontStyle: span.italic && !span.bold ? "italic" : undefined,
        };
        if (span.url && links) {
          return (
            <a
              key={index}
              href={span.url}
              target="_blank"
              rel="noreferrer"
              style={{ ...style, color: linkColor, textDecoration: "underline" }}
            >
              {span.text}
            </a>
          );
        }
        return (
          <span key={index} style={style}>
            {span.text}
          </span>
        );
      })}
    </>
  );
}
