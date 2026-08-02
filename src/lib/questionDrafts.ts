import { supabase } from "./supabase";

/**
 * AI-drafted practice questions awaiting editorial review. Generated daily by
 * the generate-activities Edge Function for statements users have in their
 * learning stacks; nothing reaches the app until approved here. Approval
 * stamps goes_live_on = tomorrow, and the app folds the question into each
 * user's practice deck at their next local midnight.
 */

export type QuestionDraftStatus = "pending" | "approved" | "rejected";

export type QuestionDraftMode = "flashcard" | "quiz" | "matching";

export type QuestionDraft = {
  id: string;
  stableKey: string;
  mode: QuestionDraftMode;
  eyebrow: string;
  prompt: string;
  explanation: string;
  reward: number;
  answer: string;
  options: string[];
  correctIndex: number | null;
  matchingRows: { left: string; right: string }[];
  model: string;
  status: QuestionDraftStatus;
  generatedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  goesLiveOn: string | null;
  statementKey: string;
  statementText: string | null;
  statementTopic: string | null;
  sourceTitle: string;
};

export async function listQuestionDrafts(
  status: QuestionDraftStatus,
): Promise<QuestionDraft[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc(
    "admin_list_generated_activity_drafts",
    { status_filter: status },
  );
  if (error) throw new Error(error.message);
  return (data ?? []) as QuestionDraft[];
}

export async function reviewQuestionDraft(
  draftId: string,
  decision: "approved" | "rejected",
): Promise<{ id: string; status: string; goesLiveOn: string | null }> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc(
    "admin_review_generated_activity_draft",
    { draft_id: draftId, decision },
  );
  if (error) throw new Error(error.message);
  return data as { id: string; status: string; goesLiveOn: string | null };
}
