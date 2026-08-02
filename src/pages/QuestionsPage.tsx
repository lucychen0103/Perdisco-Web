import type { Session } from "@supabase/supabase-js";
import { Check, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  listQuestionDrafts,
  reviewQuestionDraft,
  type QuestionDraft,
  type QuestionDraftStatus,
} from "../lib/questionDrafts";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useApp } from "../state";
import {
  Card,
  EmptyState,
  Eyebrow,
  FieldLabel,
  PrimaryButton,
  Row,
  StatusPill,
  inputStyle,
} from "../ui";

const STATUS_TABS: QuestionDraftStatus[] = ["pending", "approved", "rejected"];

const MODE_LABELS: Record<QuestionDraft["mode"], string> = {
  flashcard: "Flashcard",
  quiz: "Applied quiz",
  matching: "Matching",
};

/**
 * Review queue for AI-drafted practice questions. Drafts arrive daily from the
 * generate-activities Edge Function; approving one schedules it to go live in
 * users' practice decks at their next local midnight.
 */
export function QuestionsPage() {
  const { notify } = useApp();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<QuestionDraftStatus>("pending");
  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDrafts(await listQuestionDrafts(tab));
    } catch (listError) {
      setError((listError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (session) void refresh();
  }, [session, refresh]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy("signin");
    const { error: signInError } = await supabase!.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) setError(signInError.message);
    else setPassword("");
    setBusy(null);
  };

  const review = async (draft: QuestionDraft, decision: "approved" | "rejected") => {
    setBusy(draft.id);
    setError(null);
    try {
      const result = await reviewQuestionDraft(draft.id, decision);
      notify(
        decision === "approved"
          ? `Question approved — live in decks from ${result.goesLiveOn}`
          : "Question rejected",
      );
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
    } catch (reviewError) {
      setError((reviewError as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <>
      <Eyebrow>Review</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        AI question drafts
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6, maxWidth: 640 }}>
        Drafted nightly for insights readers have saved to their learning stacks.
        Nothing reaches the app until approved here; an approved question joins
        each user&apos;s daily deck at their next local midnight.
      </div>
    </>
  );

  if (!isSupabaseConfigured) {
    return (
      <div style={{ maxWidth: 1000 }}>
        {header}
        <Card style={{ padding: 16, marginTop: 18 }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then
            restart the dev server.
          </div>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 1000 }}>
        {header}
        <Card style={{ padding: 16, marginTop: 18, maxWidth: 420 }}>
          <Row gap={8}>
            <ShieldCheck size={16} color="var(--forest)" />
            <Eyebrow>Sign in to review</Eyebrow>
          </Row>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Reviewing drafts writes editorial decisions to the shared database,
            so it requires an editorial account.
          </div>
          <form onSubmit={signIn} style={{ marginTop: 12 }}>
            <FieldLabel>Email</FieldLabel>
            <input
              style={inputStyle}
              type="email"
              value={email}
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <div style={{ height: 10 }} />
            <FieldLabel>Password</FieldLabel>
            <input
              style={inputStyle}
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <div style={{ height: 12 }} />
            <PrimaryButton
              label={busy === "signin" ? "Signing in…" : "Sign in"}
              disabled={busy === "signin"}
            />
          </form>
          {error ? (
            <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 10 }}>{error}</div>
          ) : null}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      {header}

      <Row gap={6} wrap style={{ marginTop: 18 }}>
        {STATUS_TABS.map((status) => (
          <button
            key={status}
            onClick={() => setTab(status)}
            className="pill"
            style={{
              padding: "8px 13px",
              fontSize: 10,
              textTransform: "capitalize",
              background: tab === status ? "var(--forest)" : "var(--paper)",
              color: tab === status ? "var(--white)" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            {status}
          </button>
        ))}
        <button
          className="icon-button"
          onClick={() => void refresh()}
          title="Refresh"
          style={{ width: 32, height: 32, marginLeft: "auto" }}
        >
          <RefreshCw size={14} />
        </button>
      </Row>

      {error ? (
        <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 12 }}>{error}</div>
      ) : null}

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <EmptyState title="Loading…" detail="Fetching drafts from the shared backend." />
        ) : drafts.length === 0 ? (
          <EmptyState
            title={tab === "pending" ? "Queue clear" : `No ${tab} drafts`}
            detail={
              tab === "pending"
                ? "New drafts arrive each night for statements in readers' learning stacks."
                : "Decisions will appear here as you review."
            }
          />
        ) : (
          drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              busy={busy === draft.id}
              onReview={tab === "pending" ? review : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  busy,
  onReview,
}: {
  draft: QuestionDraft;
  busy: boolean;
  onReview?: (draft: QuestionDraft, decision: "approved" | "rejected") => void;
}) {
  return (
    <Card style={{ padding: 16 }}>
      <Row gap={8} wrap>
        <Sparkles size={14} color="var(--forest)" />
        <StatusPill value={MODE_LABELS[draft.mode]} />
        {draft.statementTopic ? (
          <span className="eyebrow" style={{ fontSize: 8.5, color: "var(--muted)" }}>
            {draft.statementTopic}
          </span>
        ) : null}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--subtle)" }}>
          {draft.model || "model unknown"} ·{" "}
          {new Date(draft.generatedAt).toLocaleDateString()}
        </span>
      </Row>

      <div
        style={{
          fontSize: 11,
          color: "var(--muted)",
          marginTop: 9,
          paddingLeft: 10,
          borderLeft: "2px solid var(--line)",
          lineHeight: 1.5,
        }}
      >
        Practises: {draft.statementText ?? draft.statementKey}
        <span style={{ color: "var(--subtle)" }}> — {draft.sourceTitle}</span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 10, lineHeight: 1.45 }}>
        {draft.prompt}
      </div>

      {draft.mode === "flashcard" ? (
        <div style={{ fontSize: 12.5, marginTop: 7 }}>
          <span style={{ color: "var(--muted)" }}>Answer: </span>
          {draft.answer}
        </div>
      ) : null}

      {draft.mode === "quiz" ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {draft.options.map((option, index) => {
            const correct = index === draft.correctIndex;
            return (
              <div
                key={option}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 9,
                  background: correct ? "var(--lime, #DCE8B0)" : "var(--paper-muted)",
                  fontWeight: correct ? 700 : 400,
                }}
              >
                {String.fromCharCode(65 + index)}. {option}
                {correct ? " ✓" : ""}
              </div>
            );
          })}
        </div>
      ) : null}

      {draft.mode === "matching" ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {draft.matchingRows.map((row) => (
            <div
              key={row.left}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 9,
                background: "var(--paper-muted)",
              }}
            >
              <strong>{row.left}</strong>
              <span style={{ color: "var(--muted)" }}> ⟷ {row.right}</span>
            </div>
          ))}
        </div>
      ) : null}

      {draft.explanation ? (
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
          {draft.explanation}
        </div>
      ) : null}

      <Row gap={8} style={{ marginTop: 12 }}>
        {onReview ? (
          <>
            <PrimaryButton
              small
              label={busy ? "Saving…" : "Approve"}
              icon={<Check size={13} />}
              disabled={busy}
              onClick={() => onReview(draft, "approved")}
            />
            <PrimaryButton
              small
              variant="light"
              label="Reject"
              icon={<X size={13} />}
              disabled={busy}
              onClick={() => onReview(draft, "rejected")}
            />
            <span style={{ fontSize: 10, color: "var(--subtle)", marginLeft: "auto" }}>
              Approving schedules it for users&apos; next local midnight
            </span>
          </>
        ) : (
          <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
            {draft.status === "approved"
              ? `Approved by ${draft.reviewedBy ?? "unknown"} · live in decks from ${draft.goesLiveOn}`
              : `Rejected by ${draft.reviewedBy ?? "unknown"}${
                  draft.reviewedAt
                    ? ` · ${new Date(draft.reviewedAt).toLocaleDateString()}`
                    : ""
                }`}
          </span>
        )}
      </Row>
    </Card>
  );
}
