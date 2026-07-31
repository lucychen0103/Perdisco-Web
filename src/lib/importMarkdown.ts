import type {
  ActivityDraft,
  ActivityMode,
  AdminStatement,
  SourceProject,
  StatementType,
  SummaryBlock,
} from "../types";

/**
 * Parses an editorial markdown file into composer blocks.
 *
 * Convention (deliberately forgiving — see FORMAT_GUIDE / SAMPLE_MARKDOWN):
 *   A `---` front-matter block is ignored: it carries source identity the editor
 *   copies into Intake & rights, none of which the composer consumes.
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
 */

export type ParsedDocument = {
  blocks: SummaryBlock[];
  statements: AdminStatement[];
  activities: ActivityDraft[];
  warnings: string[];
  counts: { text: number; statements: number; activities: number };
};

const STATEMENT_LABELS: Record<string, StatementType> = {
  FACT: "FACT",
  OPINION: "OPINION",
  FORECAST: "FORECAST",
  "MENTAL MODEL": "MENTAL MODEL",
  MODEL: "MENTAL MODEL",
  "MENTAL-MODEL": "MENTAL MODEL",
};

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

type RawSection = {
  label?: string;
  heading?: string;
  lines: string[];
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 10000).toString(36)}`;

/** Strips `- `, `* `, `**bold**`, and trailing whitespace from a metadata line. */
const cleanLine = (line: string) =>
  line
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\*\*(.+?)\*\*\s*:?/, "$1:")
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
          lines: [],
        });
      } else {
        sections.push({ heading: title, lines: [] });
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

export function parseMarkdown(
  source: string,
  project: Pick<SourceProject, "id" | "category" | "creator" | "version">,
): ParsedDocument {
  const warnings: string[] = [];
  const blocks: SummaryBlock[] = [];
  const statements: AdminStatement[] = [];
  const activities: ActivityDraft[] = [];

  // Front matter is source identity for the editor, not composer content.
  const { sections } = splitSections(source);

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

    const statementType = STATEMENT_LABELS[section.label];
    const activityMode = ACTIVITY_LABELS[section.label];

    if (!statementType && !activityMode) {
      warnings.push(
        `Unknown block label “${section.label}” — imported as summary text. Use FACT, OPINION, FORECAST, MENTAL MODEL, FLASHCARD, QUIZ, MATCHING, POLL, or PREDICTION.`,
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
        topic: meta.topic ?? project.category,
        learningEligible: meta.learning ? isTruthy(meta.learning) : Boolean(context),
        attribution: meta.attribution ?? meta.speaker ?? project.creator,
        anchor: `${project.id}/v${project.version}#${id}`,
        aiSuggested: false,
        elaborationState: context ? "Draft" : "Empty",
        discussionEnabled: meta.discussion ? isTruthy(meta.discussion) : true,
      });
      blocks.push({ kind: "statement", id: uid("blk"), statementId: id });
      if (!context) {
        warnings.push(
          `Statement “${section.heading.slice(0, 40)}…” has no elaboration text — it cannot publish as tappable.`,
        );
      }
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

    activities.push(activity);
    blocks.push({ kind: "activity", id: uid("blk"), activityId: id });
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

  return {
    blocks,
    statements,
    activities,
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

The source starts by reframing the headline claim around the work a buyer needs completed.

## FACT — A robot that works 90% of the time is often less useful than it sounds.
locator: 58:03
attribution: Dr. Maya Chen

In a 100-step workflow, a 90% per-step success rate compounds into near-certain failure.
Buyers care about completed jobs, not impressive individual actions.

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
`;

export const FORMAT_GUIDE: { syntax: string; meaning: string }[] = [
  { syntax: "Plain paragraph", meaning: "Becomes a summary-text block, in order" },
  { syntax: "## FACT — text", meaning: "Statement (also OPINION, FORECAST, MENTAL MODEL)" },
  { syntax: "## QUIZ — prompt", meaning: "Activity (FLASHCARD, QUIZ, MATCHING, POLL, PREDICTION)" },
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
