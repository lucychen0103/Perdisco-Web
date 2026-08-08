import { supabase } from "./supabase";
import type { WorkspaceSnapshot } from "./workspace";
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
 * Rebuilds editorial drafts from the published consumer projection.
 *
 * Runs once, when the draft workspace is empty but published summaries exist —
 * content published before draft persistence landed, or a workspace that was
 * wiped. Published versions carry every consumer-facing field; admin-only
 * review metadata (rights, processing, gates) cannot be recovered, so it is
 * restored as post-publish defaults: cleared, complete, approved.
 */

type ConsumerStatementRow = {
  id: string;
  position: number;
  type: StatementType;
  text: string;
  context: string;
  locator: string;
  sourceMoment: string;
  supportingSource: string;
  supportingUrl: string;
  topic: string;
  learningEligible: boolean;
};

type ConsumerActivityRow = {
  id: string;
  position: number;
  mode: "flashcard" | "quiz" | "matching";
  statementId: string | null;
  eyebrow: string;
  prompt: string;
  explanation: string;
  reward: number;
  answer: string;
  options: string[];
  correctIndex: number | null;
  matchingRows: { left: string; right: string }[];
};

type ConsumerSummaryRow = {
  summary_id: string;
  release_id: string;
  version_number: number;
  published_at: string;
  cohort: string;
  source: {
    kind: "Podcasts" | "Interviews" | "Articles" | "Research papers";
    medium: SourceProject["medium"];
    title: string;
    shortTitle: string;
    author: string;
    role: string;
    publisher: string;
    published: string;
    duration: string;
    category: string;
    initials: string;
    gradient: [string, string];
    canonicalUrl: string;
    mediaUrl: string | null;
  };
  orientation: { lead: string; close: string };
  statements: ConsumerStatementRow[];
  activities: ConsumerActivityRow[];
};

const FORMAT_BY_KIND: Record<ConsumerSummaryRow["source"]["kind"], SourceFormat> = {
  Podcasts: "Podcast",
  Interviews: "Interview",
  Articles: "Article",
  "Research papers": "Research paper",
};

const MODE_BY_CODE: Record<ConsumerActivityRow["mode"], ActivityMode> = {
  flashcard: "Flashcard",
  quiz: "Applied quiz",
  matching: "Matching",
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 10000).toString(36)}`;

function projectFromRow(row: ConsumerSummaryRow, blocks: SummaryBlock[]): SourceProject {
  const publishedDate = new Date(row.published_at);
  return {
    id: row.summary_id,
    title: row.source.title,
    shortTitle: row.source.shortTitle,
    format: FORMAT_BY_KIND[row.source.kind] ?? "Article",
    medium: row.source.medium,
    creator: row.source.author,
    creatorRole: row.source.role,
    publisher: row.source.publisher,
    canonicalUrl: row.source.canonicalUrl || "—",
    published: row.source.published,
    duration: row.source.duration,
    category: row.source.category,
    initials: row.source.initials,
    gradient: row.source.gradient,
    language: "English",
    state: "Published",
    owner: "Lucy Chen",
    contributors: [],
    workspace: "Editorial",
    organization: "Perdisco",
    priority: "Normal",
    targetRelease: "Unscheduled",
    updatedAt: publishedDate.toLocaleDateString(),
    blocks,
    rights: {
      owner: row.source.publisher || row.source.author,
      basis: "Cleared before publication (restored from published release)",
      approvedUses: ["Ingest", "Publish"],
      restrictions: "—",
      mediaBehavior: "Undetermined",
      expiry: "—",
      takedownContact: "rights@perdisco.app",
      status: "Cleared",
      reviewer: "—",
    },
    processing: [
      { name: "Media inspection", status: "Complete", detail: "Restored from published version" },
      { name: "Preflight", status: "Complete", detail: "Restored from published version" },
    ],
    gates: [
      { name: "Editorial fidelity", status: "Approved" },
      { name: "Evidence & research", status: "Approved" },
      { name: "Rights & source use", status: "Approved" },
      { name: "Learning quality", status: "Approved" },
      { name: "Community", status: "Approved" },
      { name: "Market", status: "Approved" },
      { name: "Accessibility & technical", status: "Approved" },
    ],
    blockers: [],
    version: row.version_number,
    playback: {
      primary: row.source.mediaUrl ?? "—",
      transcriptSource: "Not applicable",
      transcriptState: "Aligned",
    },
  };
}

function statementFromRow(
  row: ConsumerSummaryRow,
  statement: ConsumerStatementRow,
): AdminStatement {
  return {
    id: statement.id,
    projectId: row.summary_id,
    type: statement.type,
    text: statement.text,
    context: statement.context,
    locator: statement.locator,
    sourceMoment: statement.sourceMoment,
    supportingSource: statement.supportingSource,
    supportingUrl: statement.supportingUrl,
    topic: statement.topic,
    learningEligible: statement.learningEligible,
    attribution: row.source.author,
    anchor: `${row.summary_id}/v${row.version_number}#${statement.id}`,
    aiSuggested: false,
    elaborationState: statement.context ? "Complete" : "Empty",
    discussionEnabled: true,
  };
}

function activityFromRow(
  row: ConsumerSummaryRow,
  activity: ConsumerActivityRow,
): ActivityDraft {
  return {
    id: activity.id,
    projectId: row.summary_id,
    statementId: activity.statementId ?? "",
    mode: MODE_BY_CODE[activity.mode],
    prompt: activity.prompt,
    status: "Approved",
    aiSuggested: false,
    explanation: activity.explanation || undefined,
    reward: activity.reward || undefined,
    answer: activity.answer || undefined,
    options: activity.options.length ? activity.options : undefined,
    correctIndex: activity.correctIndex ?? undefined,
    matchingRows: activity.matchingRows.length ? activity.matchingRows : undefined,
  };
}

export async function backfillFromPublished(): Promise<WorkspaceSnapshot | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("consumer_summaries").select("*");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ConsumerSummaryRow[];
  if (rows.length === 0) return null;

  const snapshot: WorkspaceSnapshot = {
    projects: [],
    statements: [],
    activities: [],
    findings: [],
    markets: [],
    releases: [],
    cases: [],
  };

  for (const row of rows) {
    const statements = [...(row.statements ?? [])].sort((a, b) => a.position - b.position);
    const activities = [...(row.activities ?? [])].sort((a, b) => a.position - b.position);

    // Rebuild the composer document: lead text, then statements in position
    // order with each statement's activities directly after it (block-level
    // interleaving is not part of the published contract), then close text.
    const blocks: SummaryBlock[] = [];
    if (row.orientation.lead) {
      blocks.push({ kind: "text", id: uid("blk"), text: row.orientation.lead });
    }
    const orphanActivities = activities.filter(
      (activity) =>
        !activity.statementId ||
        !statements.some((statement) => statement.id === activity.statementId),
    );
    for (const statement of statements) {
      blocks.push({ kind: "statement", id: uid("blk"), statementId: statement.id });
      for (const activity of activities) {
        if (activity.statementId === statement.id) {
          blocks.push({ kind: "activity", id: uid("blk"), activityId: activity.id });
        }
      }
    }
    for (const activity of orphanActivities) {
      blocks.push({ kind: "activity", id: uid("blk"), activityId: activity.id });
    }
    if (row.orientation.close) {
      blocks.push({ kind: "text", id: uid("blk"), text: row.orientation.close });
    }

    snapshot.projects.push(projectFromRow(row, blocks));
    snapshot.statements.push(...statements.map((s) => statementFromRow(row, s)));
    snapshot.activities.push(...activities.map((a) => activityFromRow(row, a)));
    // No release rows: the Publishing page reads release history straight from
    // publishing.releases, so synthesizing local copies here would only drift.
  }

  return snapshot;
}
