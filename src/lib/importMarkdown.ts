import type {
  ActivityDraft,
  ActivityMode,
  AdminStatement,
  SourceFormat,
  SourceProject,
  StatementType,
  SummaryBlock,
} from "../types";

/**
 * Parses an editorial markdown file into composer blocks.
 *
 * Convention (deliberately forgiving — see FORMAT_GUIDE / SAMPLE_MARKDOWN):
 *   A `---` front-matter block carries source identity resolved from the RSS
 *   feed or article page. It becomes a patch for Intake & rights rather than a
 *   block — see parseFrontMatter. `enclosure:` is the one field playback
 *   depends on: it travels to playback.primary → publish payload source.mediaUrl
 *   → content.sources.media_url → the consumer projection, which the app hands
 *   to its audio player.
 *
 *   Plain paragraphs become summary-text blocks. The first one is what the
 *   mobile app shows as the summary's opening paragraph.
 *
 *   ## FACT — statement text
 *   locator: 58:03
 *   attribution: Dr. Maya Chen
 *   supporting: Title | https://url
 *   Paragraphs under the heading become the elaboration.
 *
 *   ## QUIZ — prompt
 *   * option one (correct)
 *   * option two
 *   explanation: why the key is defensible
 *
 *   Heading depth decides where an activity lives: `##` places it in the
 *   summary document, `###` places it inside the elaboration document of the
 *   nearest statement above it — it renders on that statement's own screen.
 *
 *   Once a statement section begins, plain paragraphs belong to its
 *   elaboration (including paragraphs after a `###` activity). `## TEXT — …`
 *   is the explicit way back to connective summary prose.
 */

export type ParsedDocument = {
  blocks: SummaryBlock[];
  statements: AdminStatement[];
  activities: ActivityDraft[];
  /** Source identity from the front matter, applied to the project on import. */
  source?: ParsedSource;
  warnings: string[];
  counts: { text: number; statements: number; activities: number };
};

export type ParsedSource = {
  /** Merged into the project when the editor applies source identity. */
  patch: Partial<SourceProject>;
  /** Field-by-field preview of that patch, in display order. */
  fields: { label: string; value: string }[];
  /** Media URL as written, before the http(s) check. */
  mediaUrl: string;
  /** The same URL once it is safe to hand to the player; empty if it is not. */
  playableUrl: string;
  /** A feed URL, which is reference only — the importer resolves no episodes. */
  feedUrl: string;
};

const STATEMENT_LABELS: Record<string, StatementType> = {
  FACT: "FACT",
  OPINION: "OPINION",
  FORECAST: "FORECAST",
  "MENTAL MODEL": "MENTAL MODEL",
  MODEL: "MENTAL MODEL",
  "MENTAL-MODEL": "MENTAL MODEL",
};

/** `## TEXT — prose` returns to summary text after a statement or activity section. */
const TEXT_LABELS = new Set(["TEXT", "SUMMARY", "PROSE"]);

const ACTIVITY_LABELS: Record<string, ActivityMode> = {
  FLASHCARD: "Flashcard",
  CARD: "Flashcard",
  QUIZ: "Applied quiz",
  "APPLIED QUIZ": "Applied quiz",
  MATCHING: "Matching",
  MATCH: "Matching",
  POLL: "Poll",
  PREDICTION: "Prediction",
  MARKET: "Prediction",
};

const META_KEYS = new Set([
  "locator",
  "timestamp",
  "time",
  "page",
  "attribution",
  "speaker",
  "supporting",
  "source",
  "moment",
  "quote",
  "topic",
  "learning",
  "discussion",
  "answer",
  "explanation",
  "reward",
  "tokens",
  "market",
  "statement",
]);

/**
 * Front-matter keys the importer understands, normalized to lowercase letters
 * and digits. Generous on aliases because the file is drafted from an RSS item,
 * a YouTube page, or an article header, and each names these things differently.
 */
const FRONT_MATTER_KEYS: Record<string, string> = {
  title: "title",
  episode: "title",
  episodetitle: "title",
  creator: "creator",
  author: "creator",
  host: "creator",
  speaker: "creator",
  byline: "creator",
  creatorrole: "creatorRole",
  role: "creatorRole",
  publisher: "publisher",
  publication: "publisher",
  show: "publisher",
  podcast: "publisher",
  network: "publisher",
  feedtitle: "publisher",
  published: "published",
  publishedat: "published",
  pubdate: "published",
  date: "published",
  publicationdate: "published",
  duration: "duration",
  length: "duration",
  runtime: "duration",
  episodeurl: "canonicalUrl",
  episodelink: "canonicalUrl",
  canonicalurl: "canonicalUrl",
  articleurl: "canonicalUrl",
  sourceurl: "canonicalUrl",
  pageurl: "canonicalUrl",
  url: "canonicalUrl",
  link: "canonicalUrl",
  enclosure: "mediaUrl",
  enclosureurl: "mediaUrl",
  audio: "mediaUrl",
  audiourl: "mediaUrl",
  video: "mediaUrl",
  videourl: "mediaUrl",
  media: "mediaUrl",
  mediaurl: "mediaUrl",
  mp3: "mediaUrl",
  stream: "mediaUrl",
  streamurl: "mediaUrl",
  feed: "feedUrl",
  feedurl: "feedUrl",
  rss: "feedUrl",
  rssurl: "feedUrl",
  rssfeed: "feedUrl",
  language: "language",
  lang: "language",
  category: "category",
  topic: "category",
  subject: "category",
  format: "format",
  kind: "format",
  medium: "medium",
  contenttype: "medium",
};

const FORMAT_VALUES: Record<string, SourceFormat> = {
  podcast: "Podcast",
  podcasts: "Podcast",
  video: "Video",
  videos: "Video",
  interview: "Interview",
  interviews: "Interview",
  article: "Article",
  articles: "Article",
  essay: "Article",
  researchpaper: "Research paper",
  researchpapers: "Research paper",
  research: "Research paper",
  paper: "Research paper",
};

const MEDIUM_VALUES: Record<string, SourceProject["medium"]> = {
  audio: "audio",
  video: "video",
  text: "text",
  pdf: "pdf",
};

const MEDIUM_BY_FORMAT: Record<SourceFormat, SourceProject["medium"]> = {
  Podcast: "audio",
  Video: "video",
  Interview: "video",
  Article: "text",
  "Research paper": "pdf",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type RawSection = {
  label?: string;
  heading?: string;
  /** ATX heading depth: 2 for `##`, 3 for `###`. Absent for the preamble. */
  depth?: number;
  lines: string[];
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 10000).toString(36)}`;

/**
 * Strips `- `, `* `, `**bold**`, and trailing whitespace from a metadata line.
 * A bolded key keeps exactly one colon whether or not the colon was inside the
 * bold markers, so `**Locator:** 58:03` and `**Locator** 58:03` both survive as
 * `Locator: 58:03`.
 */
const cleanLine = (line: string) =>
  line
    .replace(/^\s*[-*+]\s+/, "")
    .replace(
      /^\s*\*\*(.+?)\*\*/,
      (_match, key: string) => `${key.replace(/\s*:\s*$/, "")}:`,
    )
    .trim();

const parseMeta = (line: string): { key: string; value: string } | null => {
  const cleaned = cleanLine(line);
  const match = cleaned.match(/^([A-Za-z][A-Za-z \-_]{0,20}?)\s*:\s*(.*)$/);
  if (!match) return null;
  const key = match[1].trim().toLowerCase().replace(/[\s-]+/g, "");
  const normalized = [...META_KEYS].find((candidate) => candidate.replace(/\s/g, "") === key);
  if (!normalized) return null;
  return { key: normalized, value: match[2].trim() };
};

const isBullet = (line: string) => /^\s*([-*+]|\d+[.)])\s+/.test(line);

const stripBullet = (line: string) =>
  line.replace(/^\s*([-*+]|\d+[.)])\s+/, "").trim();

const isTruthy = (value: string) =>
  /^(yes|true|on|eligible|enabled|1)$/i.test(value.trim());

/** Splits the document on ATX headings, keeping any preamble as an unlabeled section. */
function splitSections(source: string): { frontMatter: string[]; sections: RawSection[] } {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const frontMatter: string[] = [];
  let cursor = 0;

  if (lines[0]?.trim() === "---") {
    cursor = 1;
    while (cursor < lines.length && lines[cursor].trim() !== "---") {
      frontMatter.push(lines[cursor]);
      cursor += 1;
    }
    cursor += 1;
  }

  const sections: RawSection[] = [{ lines: [] }];
  for (; cursor < lines.length; cursor += 1) {
    const line = lines[cursor];
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const title = heading[2].trim();
      // A single top-level `#` before any content is the source title, not a block.
      if (heading[1].length === 1 && sections.length === 1 && sections[0].lines.join("").trim() === "") {
        continue;
      }
      const labelMatch = title.match(/^([A-Za-z][A-Za-z \-]{0,18}?)\s*(?:[—–\-:|]|\.\s)\s*(.+)$/);
      if (labelMatch) {
        sections.push({
          label: labelMatch[1].trim().toUpperCase(),
          heading: labelMatch[2].trim(),
          depth: heading[1].length,
          lines: [],
        });
      } else {
        sections.push({ heading: title, depth: heading[1].length, lines: [] });
      }
      continue;
    }
    sections[sections.length - 1].lines.push(line);
  }
  return { frontMatter, sections };
}

/** Groups consecutive non-blank, non-bullet, non-meta lines into paragraphs. */
function toParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    const text = current.join(" ").trim();
    if (text) paragraphs.push(text);
    current = [];
  };
  lines.forEach((line) => {
    if (!line.trim()) {
      flush();
      return;
    }
    current.push(line.replace(/^>\s?/, "").trim());
  });
  flush();
  return paragraphs;
}

/** Unwraps `<url>`, `"url"`, and `[label](url)` around a front-matter value. */
const cleanUrl = (value: string) => {
  const trimmed = value
    .trim()
    .replace(/^<(.*)>$/, "$1")
    .replace(/^["'](.*)["']$/, "$1")
    .trim();
  const link = trimmed.match(/^\[[^\]]*\]\((\S+?)\)$/);
  return (link ? link[1] : trimmed).trim();
};

const token = (value: string) => value.trim().toLowerCase().replace(/[^a-z]/g, "");

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

/** ISO and RFC-2822 (RSS `pubDate`) dates become the app's display form. */
function formatPublished(value: string): string {
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const month = MONTHS[Number(iso[2]) - 1];
    if (month) return `${Number(iso[3])} ${month} ${iso[1]}`;
  }
  const rfc = raw.match(/^(?:\w{3},\s*)?(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (rfc) {
    const index = MONTHS.findIndex(
      (month) => month.toLowerCase() === rfc[2].toLowerCase(),
    );
    if (index >= 0) return `${Number(rfc[1])} ${MONTHS[index]} ${rfc[3]}`;
  }
  return raw;
}

/**
 * `2:14:00` and `8040` (the two forms `itunes:duration` takes) become `2h 14m`,
 * matching the label the consumer feed renders. Anything else passes through —
 * a duration we cannot read is better shown verbatim than guessed at.
 */
function formatDuration(value: string): string {
  const raw = value.trim();
  const clock = raw.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  const seconds = clock
    ? (clock[1] ? Number(clock[1]) * 3600 : 0) + Number(clock[2]) * 60 + Number(clock[3])
    : /^\d+$/.test(raw)
      ? Number(raw)
      : null;
  if (seconds === null || seconds < 60) return raw;
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function mediumFromUrl(url: string): SourceProject["medium"] | undefined {
  if (/\.(mp3|m4a|m4b|aac|wav|ogg|oga|opus|flac)(\?|#|$)/i.test(url)) return "audio";
  if (/\.(mp4|m4v|mov|webm|mkv)(\?|#|$)/i.test(url)) return "video";
  if (/\.pdf(\?|#|$)/i.test(url)) return "pdf";
  return undefined;
}

/**
 * Seconds offset for a time-style locator, mirroring `locatorSeconds` in the
 * consumer app. Kept in step with it: a locator this rejects is one the player
 * cannot seek to, which is what the import warning reports.
 */
function locatorSeconds(locator: string): number | null {
  const match = locator.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return (
    (match[1] ? Number(match[1]) * 3600 : 0) + Number(match[2]) * 60 + Number(match[3])
  );
}

/** Reads `key: value` lines out of the `---` block. First value for a key wins. */
function parseFrontMatter(lines: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  lines.forEach((line) => {
    const match = cleanLine(line).match(/^([A-Za-z][A-Za-z0-9 _-]{0,28}?)\s*:\s*(.+)$/);
    if (!match) return;
    const canonical = FRONT_MATTER_KEYS[match[1].toLowerCase().replace(/[^a-z0-9]/g, "")];
    if (!canonical || canonical in values) return;
    values[canonical] = match[2].trim();
  });
  return values;
}

/**
 * Turns front matter into a patch for the project's source identity.
 *
 * The one field with consequences beyond the editor's reading is `mediaUrl`:
 * it lands in playback.primary, which is what publishing sends as
 * source.mediaUrl and what the app plays. The app ignores anything that is not
 * an http(s) URL (placeholders like "RSS · unresolved" reach it otherwise), so
 * a value that fails that check is reported rather than written.
 */
function buildSourcePatch(
  values: Record<string, string>,
  project: Pick<SourceProject, "playback" | "medium">,
): ParsedSource | undefined {
  const patch: Partial<SourceProject> = {};
  const fields: { label: string; value: string }[] = [];
  const add = (label: string, value: string) => fields.push({ label, value });

  if (values.title) {
    patch.title = values.title;
    patch.shortTitle =
      values.title.length > 32 ? `${values.title.slice(0, 32)}…` : values.title;
    add("Title", values.title);
  }
  if (values.creator) {
    patch.creator = values.creator;
    patch.initials = initialsOf(values.creator);
    add("Creator", values.creator);
  }
  if (values.creatorRole) {
    patch.creatorRole = values.creatorRole;
    add("Creator role", values.creatorRole);
  }
  if (values.publisher) {
    patch.publisher = values.publisher;
    add("Publication", values.publisher);
  }
  if (values.published) {
    patch.published = formatPublished(values.published);
    add("Published", patch.published);
  }
  if (values.duration) {
    patch.duration = formatDuration(values.duration);
    add("Duration", patch.duration);
  }
  if (values.language) {
    patch.language = values.language;
    add("Language", values.language);
  }
  if (values.category) {
    patch.category = values.category.toUpperCase();
    add("Category", patch.category);
  }

  const canonicalUrl = values.canonicalUrl ? cleanUrl(values.canonicalUrl) : "";
  if (canonicalUrl) {
    patch.canonicalUrl = canonicalUrl;
    add("Canonical URL", canonicalUrl);
  }

  const format = values.format ? FORMAT_VALUES[token(values.format)] : undefined;
  if (format) {
    patch.format = format;
    add("Format", format);
  }

  const mediaUrl = values.mediaUrl ? cleanUrl(values.mediaUrl) : "";
  const playableUrl = /^https?:\/\//i.test(mediaUrl) ? mediaUrl : "";
  if (playableUrl) {
    patch.playback = { ...project.playback, primary: playableUrl };
    add("Playback source", playableUrl);
  }

  const medium =
    (values.medium ? MEDIUM_VALUES[token(values.medium)] : undefined) ??
    mediumFromUrl(playableUrl) ??
    (format ? MEDIUM_BY_FORMAT[format] : undefined);
  if (medium && medium !== project.medium) {
    patch.medium = medium;
    add("Medium", medium);
  }

  const feedUrl = values.feedUrl ? cleanUrl(values.feedUrl) : "";
  if (fields.length === 0 && !mediaUrl && !feedUrl) return undefined;
  return { patch, fields, mediaUrl, playableUrl, feedUrl };
}

export function parseMarkdown(
  source: string,
  project: Pick<
    SourceProject,
    "id" | "category" | "creator" | "version" | "medium" | "playback"
  >,
): ParsedDocument {
  const warnings: string[] = [];
  const blocks: SummaryBlock[] = [];
  const statements: AdminStatement[] = [];
  const activities: ActivityDraft[] = [];

  const { frontMatter, sections } = splitSections(source);
  const parsedSource = buildSourcePatch(parseFrontMatter(frontMatter), project);

  // Statements fall back to the source's own category and creator, so a project
  // being renamed by this same import has to use the incoming values.
  const category = parsedSource?.patch.category ?? project.category;
  const creator = parsedSource?.patch.creator ?? project.creator;

  sections.forEach((section) => {
    // --- Unlabeled preamble / prose-only section -> summary text blocks
    if (!section.label) {
      if (section.heading) {
        warnings.push(
          `Heading “${section.heading}” has no FACT/OPINION/QUIZ-style label — imported as summary text.`,
        );
        blocks.push({ kind: "text", id: uid("blk"), text: section.heading });
      }
      toParagraphs(section.lines).forEach((text) => {
        blocks.push({ kind: "text", id: uid("blk"), text });
      });
      return;
    }

    // `## TEXT — prose` is an explicit summary-text block: the only way to
    // return to connective summary prose once a statement section has begun.
    if (TEXT_LABELS.has(section.label)) {
      [section.heading, ...toParagraphs(section.lines)]
        .filter((text): text is string => Boolean(text))
        .forEach((text) => blocks.push({ kind: "text", id: uid("blk"), text }));
      return;
    }

    const statementType = STATEMENT_LABELS[section.label];
    const activityMode = ACTIVITY_LABELS[section.label];

    if (!statementType && !activityMode) {
      warnings.push(
        `Unknown block label “${section.label}” — imported as summary text. Use FACT, OPINION, FORECAST, MENTAL MODEL, FLASHCARD, QUIZ, MATCHING, POLL, PREDICTION, or TEXT.`,
      );
      const text = [section.heading, ...toParagraphs(section.lines)].filter(Boolean).join(" ");
      if (text) blocks.push({ kind: "text", id: uid("blk"), text });
      return;
    }

    // Partition the section body into metadata, bullets, and prose.
    const meta: Record<string, string> = {};
    const bullets: { text: string; correct: boolean }[] = [];
    const prose: string[] = [];

    section.lines.forEach((line) => {
      if (!line.trim()) {
        prose.push(line);
        return;
      }
      const parsedMeta = parseMeta(line);
      if (parsedMeta) {
        meta[parsedMeta.key] = parsedMeta.value;
        return;
      }
      if (isBullet(line)) {
        const raw = stripBullet(line);
        const correct = /\((correct|answer|key)\)\s*$/i.test(raw) || /^\[x\]\s*/i.test(raw);
        bullets.push({
          text: raw
            .replace(/\((correct|answer|key)\)\s*$/i, "")
            .replace(/^\[[ xX]\]\s*/, "")
            .trim(),
          correct,
        });
        return;
      }
      prose.push(line);
    });

    const paragraphs = toParagraphs(prose);

    if (statementType) {
      if (!section.heading) {
        warnings.push(`A ${section.label} block had no statement text and was skipped.`);
        return;
      }
      const id = uid("s");
      const supporting = meta.supporting ?? meta.source ?? "";
      const [supportingSource, supportingUrl] = supporting
        .split("|")
        .map((part) => part.trim());
      const context = paragraphs.join("\n\n");
      statements.push({
        id,
        projectId: project.id,
        type: statementType,
        text: section.heading,
        context,
        locator: meta.locator ?? meta.timestamp ?? meta.time ?? meta.page ?? "—",
        sourceMoment: meta.moment ?? meta.quote ?? "",
        supportingSource: supportingSource ?? "",
        supportingUrl: supportingUrl ?? "",
        topic: meta.topic ?? category,
        learningEligible: meta.learning ? isTruthy(meta.learning) : Boolean(context),
        attribution: meta.attribution ?? meta.speaker ?? creator,
        anchor: `${project.id}/v${project.version}#${id}`,
        aiSuggested: false,
        elaborationState: context ? "Draft" : "Empty",
        discussionEnabled: meta.discussion ? isTruthy(meta.discussion) : true,
      });
      blocks.push({ kind: "statement", id: uid("blk"), statementId: id });
      return;
    }

    // --- Activity
    if (!section.heading) {
      warnings.push(`A ${section.label} block had no prompt and was skipped.`);
      return;
    }
    const id = uid("act");
    const activity: ActivityDraft = {
      id,
      projectId: project.id,
      statementId: "",
      mode: activityMode,
      prompt: section.heading,
      status: "Draft",
      aiSuggested: false,
      explanation: meta.explanation ?? (paragraphs.length ? paragraphs.join("\n\n") : undefined),
    };

    const reward = Number(meta.reward ?? meta.tokens);
    if (!Number.isNaN(reward) && (meta.reward || meta.tokens)) activity.reward = reward;

    if (activityMode === "Flashcard") {
      activity.answer = meta.answer ?? bullets[0]?.text ?? "";
      if (!activity.answer) {
        warnings.push(`Flashcard “${section.heading.slice(0, 40)}…” has no answer: line.`);
      }
    }

    if (activityMode === "Applied quiz" || activityMode === "Poll") {
      activity.options = bullets.map((bullet) => bullet.text);
      if (activityMode === "Applied quiz") {
        const correctIndex = bullets.findIndex((bullet) => bullet.correct);
        activity.correctIndex = correctIndex >= 0 ? correctIndex : 0;
        if (correctIndex < 0) {
          warnings.push(
            `Quiz “${section.heading.slice(0, 40)}…” has no option marked (correct) — defaulted to the first.`,
          );
        }
      }
      if (activity.options.length < 2) {
        warnings.push(
          `${activityMode} “${section.heading.slice(0, 40)}…” needs at least two options.`,
        );
        activity.options = [...activity.options, "", ""].slice(0, 2);
      }
    }

    if (activityMode === "Matching") {
      activity.matchingRows = bullets
        .map((bullet) => {
          const parts = bullet.text.split(/\s*(?:\||->|→|=>)\s*/);
          return { left: (parts[0] ?? "").trim(), right: (parts[1] ?? "").trim() };
        })
        .filter((row) => row.left || row.right);
      if (activity.matchingRows.length < 2) {
        warnings.push(
          `Matching “${section.heading.slice(0, 40)}…” needs at least two “left | right” pairs.`,
        );
        activity.matchingRows = [
          ...activity.matchingRows,
          { left: "", right: "" },
          { left: "", right: "" },
        ].slice(0, 2);
      }
    }

    if (activityMode === "Prediction" && meta.market) {
      activity.marketId = meta.market;
    }

    if (activityMode === "Prediction") {
      warnings.push(
        `Prediction “${section.heading.slice(0, 40)}…” imported as a draft but will NOT publish — predictions are cut from consumer v1. Switch it to Flashcard, Applied quiz, Matching, or Poll.`,
      );
    }

    activities.push(activity);

    // `###` places the activity inside the elaboration document of the nearest
    // statement above it; `##` places it in the summary document. In a `###`
    // section, prose is more elaboration text after the activity (feedback
    // needs an explicit `explanation:` line) rather than explanation fallback.
    if ((section.depth ?? 2) >= 3) {
      const parent = statements[statements.length - 1];
      if (parent) {
        activity.statementId = parent.id;
        activity.explanation = meta.explanation;
        const elaboration = (parent.elaborationBlocks ??= parent.context.trim()
          ? [{ kind: "text", id: uid("eb"), text: parent.context }]
          : []);
        elaboration.push({ kind: "activity", id: uid("eb"), activityId: id });
        paragraphs.forEach((text) =>
          elaboration.push({ kind: "text", id: uid("eb"), text }),
        );
        if (paragraphs.length > 0) {
          parent.context = elaboration
            .flatMap((block) => (block.kind === "text" ? [block.text] : []))
            .join("\n\n");
          if (parent.elaborationState === "Empty") parent.elaborationState = "Draft";
        }
        return;
      }
      warnings.push(
        `Inline activity “${section.heading.slice(0, 40)}…” (### heading) has no statement above it — placed in the summary instead.`,
      );
    }
    blocks.push({ kind: "activity", id: uid("blk"), activityId: id });
  });

  statements.forEach((statement) => {
    if (!statement.context) {
      warnings.push(
        `Statement “${statement.text.slice(0, 40)}…” has no elaboration text — it cannot publish as tappable.`,
      );
    }
  });

  // Link activities to the nearest preceding statement when not stated explicitly.
  let lastStatementId = "";
  blocks.forEach((block) => {
    if (block.kind === "statement") {
      lastStatementId = block.statementId;
      return;
    }
    if (block.kind === "activity") {
      const activity = activities.find((item) => item.id === block.activityId);
      if (activity && !activity.statementId) activity.statementId = lastStatementId;
    }
  });

  activities.forEach((activity) => {
    if (!activity.statementId) {
      warnings.push(
        `Activity “${activity.prompt.slice(0, 40)}…” has no statement above it — link one before publishing.`,
      );
    }
  });

  // --- Playback: what the app needs to render a player at all.
  const medium = parsedSource?.patch.medium ?? project.medium;
  if (!parsedSource) {
    if (statements.length > 0) {
      warnings.push(
        "No front matter — title, creator, and the playback URL stay as they are. Add a `---` block (see the AI instructions) or fill them in under Intake & rights.",
      );
    }
  } else if (parsedSource.playableUrl) {
    if (medium === "audio" || medium === "video") {
      const unseekable = statements.filter(
        (statement) => locatorSeconds(statement.locator) === null,
      );
      if (unseekable.length > 0) {
        warnings.push(
          `${unseekable.length} of ${statements.length} statements have a locator the player cannot seek to (e.g. “${unseekable[0].locator}”) — their player opens at 0:00. Use mm:ss or h:mm:ss.`,
        );
      }
    }
  } else if (parsedSource.mediaUrl) {
    warnings.push(
      `Media URL “${parsedSource.mediaUrl.slice(0, 48)}” is not an http(s) link, so it was not applied — the app renders no player without one.`,
    );
  } else if (parsedSource.feedUrl) {
    warnings.push(
      "Front matter has a feed URL but no `enclosure:` — the importer cannot pick an episode out of a feed. Add the episode's direct media file URL as `enclosure:` for in-app playback.",
    );
  } else {
    warnings.push(
      "No `enclosure:` in the front matter — the summary imports fine, but the app shows no player until Intake & rights → Playback contract holds a direct media URL.",
    );
  }

  return {
    blocks,
    statements,
    activities,
    source: parsedSource,
    warnings,
    counts: {
      text: blocks.filter((block) => block.kind === "text").length,
      statements: statements.length,
      activities: activities.length,
    },
  };
}

export const SAMPLE_MARKDOWN = `---
title: What actually makes a robotics company investable?
creator: Dr. Maya Chen
publisher: Machines at Work
published: 2026-07-28
duration: 2:14:00
episode_url: https://example.com/ep214
enclosure: https://cdn.example.com/ep214.mp3
---

# What actually makes a robotics company investable?

Robotics has spent years producing captivating demonstrations. The harder question is
whether those machines can become reliable businesses.

## FORECAST — The cost of useful robot labor will fall below $10 an hour before 2030.
locator: 42:16
attribution: Dr. Maya Chen
supporting: IFR cost benchmark | https://ifr.org/
moment: The key is useful labor, not the sticker price of a robot.

Hardware cost is no longer the only constraint. Better models, richer data, and remote
intervention push utilization high enough to make robots economical in structured settings.

## TEXT — The source starts by reframing the headline claim around the work a buyer needs completed.

## FACT — A robot that works 90% of the time is often less useful than it sounds.
locator: 58:03
attribution: Dr. Maya Chen

In a 100-step workflow, a 90% per-step success rate compounds into near-certain failure.
Buyers care about completed jobs, not impressive individual actions.

### FLASHCARD — What matters more than per-action success rate?
answer: Completed jobs — per-step reliability compounds across a workflow
reward: 10

## QUIZ — Rank these industries from most to least suitable for a 90%-reliable robot.
* Crop monitoring → Inventory scanning → Hotel delivery → Surgery (correct)
* Surgery → Hotel delivery → Inventory scanning → Crop monitoring
* Inventory scanning → Surgery → Crop monitoring → Hotel delivery
explanation: Crop monitoring tolerates missed passes; surgery requires near-zero failure.
reward: 20

## MENTAL MODEL — Look for the boring workflow hiding behind the flashy demo.
locator: 1:21:44

The most investable robotics companies start with repetitive, measurable workflows that
already have an owner, a budget, and a definition of done.

## PREDICTION — Will outcome-priced robotics reach 25% of new large warehouses by 2029?
market: warehouse-outcomes
explanation: Weigh integration cycles, warehouse replacement rates, and labor costs.

## TEXT — Reliability, not capability, decides which robotics companies become businesses.
`;

export const FORMAT_GUIDE: { syntax: string; meaning: string }[] = [
  { syntax: "--- front matter ---", meaning: "Source identity for Intake & rights" },
  { syntax: "enclosure: https://…", meaning: "Direct media file — what the app plays" },
  { syntax: "episode_url: https://…", meaning: "Canonical link to the episode or article" },
  { syntax: "Plain paragraph", meaning: "Becomes a summary-text block, in order" },
  { syntax: "## FACT — text", meaning: "Statement (also OPINION, FORECAST, MENTAL MODEL)" },
  { syntax: "## QUIZ — prompt", meaning: "Activity on the summary screen (FLASHCARD, QUIZ, MATCHING, POLL, PREDICTION)" },
  { syntax: "### QUIZ — prompt", meaning: "Activity inside the statement above it — renders on that statement's screen" },
  { syntax: "## TEXT — prose", meaning: "Summary text after a statement (plain paragraphs there are elaboration)" },
  { syntax: "locator: 58:03", meaning: "Timestamp, page, or section for the statement" },
  { syntax: "attribution: Name", meaning: "Who the statement belongs to" },
  { syntax: "supporting: Title | url", meaning: "Supporting source and link" },
  { syntax: "moment: quoted line", meaning: "Source moment, internal verification only" },
  { syntax: "Paragraphs under a statement", meaning: "Become that statement's elaboration" },
  { syntax: "* option (correct)", meaning: "Quiz/poll option; (correct) marks the answer key" },
  { syntax: "* left | right", meaning: "Matching pair" },
  { syntax: "answer: / explanation: / reward:", meaning: "Activity answer, feedback, tokens" },
  { syntax: "market: market-id", meaning: "Links a prediction to an existing market" },
];
