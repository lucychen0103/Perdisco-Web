import type {
  ActivityDraft,
  AdminStatement,
  ElaborationBlock,
  SourceProject,
} from "../types";

/**
 * A statement's ordered elaboration document — the mini composer behind each
 * statement. Drafts saved before elaborationBlocks existed are derived on the
 * fly: the context string becomes the opening prose block, and activities
 * linked to the statement but never placed in the summary document belong to
 * the elaboration (they had no composer surface at all before this).
 *
 * Derived ids are deterministic so React keys and block edits stay stable
 * until the first edit materializes the array onto the statement.
 */
export function elaborationBlocksOf(
  statement: AdminStatement,
  activities: ActivityDraft[],
  project?: SourceProject,
): ElaborationBlock[] {
  if (statement.elaborationBlocks) return statement.elaborationBlocks;
  const blocks: ElaborationBlock[] = [];
  if (statement.context.trim()) {
    blocks.push({ kind: "text", id: `${statement.id}-elab-text`, text: statement.context });
  }
  const placedInSummary = new Set(
    (project?.blocks ?? []).flatMap((block) =>
      block.kind === "activity" ? [block.activityId] : [],
    ),
  );
  for (const activity of activities) {
    if (activity.statementId === statement.id && !placedInSummary.has(activity.id)) {
      blocks.push({
        kind: "activity",
        id: `${statement.id}-elab-${activity.id}`,
        activityId: activity.id,
      });
    }
  }
  return blocks;
}

/**
 * Joined prose of an elaboration document. Mirrored into statement.context on
 * every edit so the publish contract and the "no elaboration" publish blocker
 * keep reading the field they always have.
 */
export function elaborationText(blocks: ElaborationBlock[]): string {
  return blocks
    .flatMap((block) => (block.kind === "text" ? [block.text.trim()] : []))
    .filter(Boolean)
    .join("\n\n");
}

export function elaborationActivityIds(blocks: ElaborationBlock[]): string[] {
  return blocks.flatMap((block) => (block.kind === "activity" ? [block.activityId] : []));
}
