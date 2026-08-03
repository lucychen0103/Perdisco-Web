import { elaborationActivityIds, elaborationBlocksOf } from "./elaboration";
import { supabase } from "./supabase";
import type {
  ActivityDraft,
  ActivityMode,
  AdminStatement,
  SourceProject,
  StatementType,
} from "../types";

const TYPE_CODES: Record<StatementType, string> = {
  FACT: "fact",
  OPINION: "opinion",
  FORECAST: "forecast",
  "MENTAL MODEL": "mental_model",
};

// Modes the consumer contract accepts. Prediction is cut from consumer v1, so
// it publishes as nothing.
const ACTIVITY_MODE_CODES: Partial<Record<ActivityMode, string>> = {
  Flashcard: "flashcard",
  "Applied quiz": "quiz",
  Matching: "matching",
  Poll: "poll",
};

const ACTIVITY_EYEBROWS: Partial<Record<ActivityMode, string>> = {
  Flashcard: "APPLIED RECALL",
  "Applied quiz": "APPLIED QUIZ",
  Matching: "APPLIED MATCHING",
  Poll: "QUICK POLL",
};

export type PublishResult = {
  summaryId: string;
  releaseId: string;
  versionNumber: number;
  contentHash: string;
  statementCount: number;
  activityCount: number;
};

/**
 * Builds the payload the publish RPC turns into an immutable version.
 *
 * Exported so the admin preview can be driven by exactly the same projection the
 * publisher sends — "Elabora Data Architecture" §1.4 requires preview and
 * production to interpret a summary identically.
 */
export function buildPublishPayload(
  project: SourceProject,
  statements: AdminStatement[],
  activities: ActivityDraft[],
  publishedBy: string,
  note?: string,
) {
  const textBlocks = project.blocks.filter(
    (block): block is Extract<typeof block, { kind: "text" }> => block.kind === "text",
  );
  const orderedStatementIds = project.blocks
    .filter(
      (block): block is Extract<typeof block, { kind: "statement" }> =>
        block.kind === "statement",
    )
    .map((block) => block.statementId);
  const orderedActivityIds = project.blocks
    .filter(
      (block): block is Extract<typeof block, { kind: "activity" }> =>
        block.kind === "activity",
    )
    .map((block) => block.activityId);

  const byId = new Map(statements.map((statement) => [statement.id, statement]));
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity]),
  );

  // Activities living inside statement elaborations publish too, after the
  // summary-placed ones, in statement order. Placement matters for polls: an
  // elaboration poll keeps its statement link and renders on that statement's
  // screen, while a poll placed in the summary document publishes with a null
  // link and renders on the summary screen.
  const summaryPlacedIds = new Set(orderedActivityIds);
  const seenActivityIds = new Set(orderedActivityIds);
  for (const statementId of orderedStatementIds) {
    const statement = byId.get(statementId);
    if (!statement) continue;
    for (const activityId of elaborationActivityIds(
      elaborationBlocksOf(statement, activities, project),
    )) {
      if (!seenActivityIds.has(activityId)) {
        seenActivityIds.add(activityId);
        orderedActivityIds.push(activityId);
      }
    }
  }

  return {
    publishedBy,
    note,
    source: {
      stableKey: project.id,
      format: project.format,
      contentType: project.medium,
      title: project.title,
      shortTitle: project.shortTitle,
      creatorName: project.creator,
      creatorRole: project.creatorRole,
      publicationName: project.publisher,
      canonicalUrl: project.canonicalUrl,
      mediaUrl: project.playback.primary || null,
      publishedLabel: project.published,
      durationLabel: project.duration,
      category: project.category,
      initials: project.initials,
      gradientFrom: project.gradient[0],
      gradientTo: project.gradient[1],
    },
    orientation: {
      lead: textBlocks[0]?.text ?? "",
      close: textBlocks.length > 1 ? textBlocks[textBlocks.length - 1].text : "",
    },
    statements: orderedStatementIds.flatMap((id) => {
      const statement = byId.get(id);
      if (!statement) return [];
      return [
        {
          stableKey: statement.id,
          type: TYPE_CODES[statement.type],
          text: statement.text,
          context: statement.context,
          locator: statement.locator,
          sourceMoment: statement.sourceMoment,
          supportingSource: statement.supportingSource,
          supportingUrl: statement.supportingUrl,
          topic: statement.topic,
          learningEligible: statement.learningEligible,
        },
      ];
    }),
    activities: orderedActivityIds.flatMap((id) => {
      const activity = activityById.get(id);
      const mode = activity ? ACTIVITY_MODE_CODES[activity.mode] : undefined;
      // Unknown drafts and unpublishable modes (Prediction) are dropped,
      // mirroring how TYPE_CODES gates statement types.
      if (!activity || !mode) return [];
      const statementKey =
        activity.mode === "Poll" && summaryPlacedIds.has(activity.id)
          ? null
          : activity.statementId;
      const statement = statementKey ? byId.get(statementKey) : undefined;
      const eyebrowBase = ACTIVITY_EYEBROWS[activity.mode] ?? "PRACTICE";
      return [
        {
          stableKey: activity.id,
          mode,
          statementStableKey: statementKey,
          eyebrow: statement?.topic
            ? `${eyebrowBase} · ${statement.topic.toUpperCase()}`
            : eyebrowBase,
          prompt: activity.prompt,
          explanation: activity.explanation ?? "",
          reward: activity.reward ?? 0,
          answer: activity.answer ?? "",
          options: activity.options ?? [],
          correctIndex: activity.correctIndex ?? null,
          matchingRows: activity.matchingRows ?? [],
        },
      ];
    }),
  };
}

export async function publishProject(
  project: SourceProject,
  statements: AdminStatement[],
  activities: ActivityDraft[],
  publishedBy: string,
  note?: string,
): Promise<PublishResult> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in admin/.env.local.",
    );
  }

  const payload = buildPublishPayload(project, statements, activities, publishedBy, note);
  if (payload.statements.length === 0) {
    throw new Error("This summary has no statements to publish.");
  }

  const { data, error } = await supabase.rpc("admin_publish_summary", { payload });
  if (error) throw new Error(error.message);
  return data as PublishResult;
}

export async function withdrawProject(projectId: string, reason?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("admin_withdraw_summary", {
    summary_key: projectId,
    reason,
  });
  if (error) throw new Error(error.message);
  return data;
}
