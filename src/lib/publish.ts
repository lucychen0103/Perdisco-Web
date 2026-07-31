import { supabase } from "./supabase";
import type { AdminStatement, SourceProject, StatementType } from "../types";

const TYPE_CODES: Record<StatementType, string> = {
  FACT: "fact",
  OPINION: "opinion",
  FORECAST: "forecast",
  "MENTAL MODEL": "mental_model",
};

export type PublishResult = {
  summaryId: string;
  releaseId: string;
  versionNumber: number;
  contentHash: string;
  statementCount: number;
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

  const byId = new Map(statements.map((statement) => [statement.id, statement]));

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
  };
}

export async function publishProject(
  project: SourceProject,
  statements: AdminStatement[],
  publishedBy: string,
  note?: string,
): Promise<PublishResult> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in admin/.env.local.",
    );
  }

  const payload = buildPublishPayload(project, statements, publishedBy, note);
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
