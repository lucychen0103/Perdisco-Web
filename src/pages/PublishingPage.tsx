import { useCallback, useEffect, useState, type ReactNode } from "react";
import { listReleases, publishProject, type ReleaseRecord } from "../lib/publish";
import { isSupabaseConfigured } from "../lib/supabase";
import { useApp } from "../state";
import { PublishPanel } from "./PublishPanel";
import {
  Card,
  EmptyState,
  Eyebrow,
  PrimaryButton,
  Row,
  SectionTitle,
  Stat,
  StatusPill,
} from "../ui";
import type { Release } from "../types";

/**
 * Release state on this page comes from publishing.releases — the same table
 * the consumer projection reads — so a Live pill here means the mobile app is
 * serving that version right now. The only locally-owned rows are the
 * scheduling queue: releases waiting for a publisher, which exist nowhere else.
 */
export function PublishingPage() {
  const {
    releases,
    projects,
    navigate,
    notify,
    session,
    statementsFor,
    activitiesFor,
    updateProject,
    pruneReleases,
  } = useApp();

  const [history, setHistory] = useState<ReleaseRecord[] | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const byId = (id: string) => projects.find((project) => project.id === id);
  const queue = releases.filter((release) => release.state === "Scheduled");

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !session) return;
    setHistoryBusy(true);
    setHistoryError(null);
    try {
      const rows = await listReleases();
      setHistory(rows);
      // The database owns release history now. Any local rows besides the
      // scheduling queue are leftovers from when publishes appended a "Live"
      // row here — drop them so stale pills never resurface.
      pruneReleases((release) => release.state === "Scheduled");
    } catch (error) {
      setHistoryError((error as Error).message);
    } finally {
      setHistoryBusy(false);
    }
  }, [session, pruneReleases]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const live = history?.filter((row) => row.state === "Live").length ?? 0;
  const failed = history?.filter((row) => row.state === "Failed").length ?? 0;
  const corrected = history?.filter((row) => row.state === "Corrected").length ?? 0;

  /**
   * Publishes the queued project for real. This publishes the composer's
   * current content — if it changed since scheduling, the released version
   * number will be higher than the queued one, and the toast reports what
   * actually shipped.
   */
  const releaseNow = async (queued: Release) => {
    const project = byId(queued.projectId);
    if (!project) return;
    if (!session) {
      notify("Sign in above first — releasing needs an editorial account.");
      return;
    }
    setReleasingId(queued.id);
    try {
      const result = await publishProject(
        project,
        statementsFor(project.id),
        activitiesFor(project.id),
        session.user.email ?? "admin",
      );
      pruneReleases((release) => release.projectId !== project.id);
      updateProject(project.id, {
        state: "Published",
        version: result.versionNumber,
        updatedAt: "Just now",
      });
      notify(`Release live — v${result.versionNumber} serving all users`);
      await refresh();
    } catch (error) {
      notify(`Release failed — ${(error as Error).message}`);
    } finally {
      setReleasingId(null);
    }
  };

  const historyEmptyState = () => {
    if (!isSupabaseConfigured) {
      return (
        <EmptyState
          title="Release state unavailable"
          detail="Releases live in the shared database. Configure Supabase to see what versions are serving readers."
        />
      );
    }
    if (!session) {
      return (
        <EmptyState
          title="Sign in to load release history"
          detail="Release state comes from the database, so it needs the editorial account above."
        />
      );
    }
    if (historyError) {
      return (
        <Card style={{ padding: 15 }}>
          <div style={{ fontSize: 13, color: "var(--danger)" }}>
            Could not load release history — {historyError}
          </div>
          <div style={{ marginTop: 10 }}>
            <PrimaryButton small variant="light" label="Retry" onClick={() => void refresh()} />
          </div>
        </Card>
      );
    }
    // null means the first fetch hasn't resolved yet (the effect fires right
    // after mount), so don't flash "No releases yet" in the meantime.
    if (history === null) {
      return <EmptyState title="Loading release history…" detail="Reading publishing.releases." />;
    }
    return (
      <EmptyState
        title="No releases yet"
        detail="A release appears here once an approved version is published from a project."
      />
    );
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <Eyebrow>Publishing</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        Releases
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
        Only immutable approved versions publish. Each publish points the live release
        at the new version and demotes the previous one to Corrected — one version
        serves readers at a time.
      </div>

      <div style={{ marginTop: 20 }}>
        <PublishPanel onPublished={() => void refresh()} />
      </div>

      <Row gap={12} wrap style={{ marginTop: 20 }}>
        <Stat label="Live" value={live} tone="ok" hint="Serving all clients" />
        <Stat label="Scheduled" value={queue.length} hint="Awaiting release window" />
        <Stat
          label="Failed"
          value={failed}
          tone={failed ? "danger" : "ok"}
          hint="Retry or roll back"
        />
        <Stat label="Rollback eligible" value={corrected} hint="Approved prior versions" />
      </Row>

      {queue.length > 0 ? (
        <>
          <SectionTitle eyebrow="Queued locally" title="Release queue" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {queue.map((release) => {
              const project = byId(release.projectId);
              if (!project) return null;
              return (
                <ReleaseCard
                  key={release.id}
                  gradient={project.gradient}
                  initials={project.initials}
                  title={project.title}
                  onTitleClick={() => navigate(`project/${project.id}`)}
                  version={release.version}
                  meta={`${release.when} · ${release.cohort} · queued by ${release.publisher}`}
                  state={release.state}
                  actions={
                    <PrimaryButton
                      small
                      variant="light"
                      label={releasingId === release.id ? "Releasing…" : "Release now"}
                      disabled={releasingId === release.id}
                      onClick={() => void releaseNow(release)}
                    />
                  }
                />
              );
            })}
          </div>
        </>
      ) : null}

      <SectionTitle
        eyebrow="publishing.releases"
        title="Release history"
        action={session && isSupabaseConfigured ? (historyBusy ? "Refreshing…" : "Refresh") : undefined}
        onAction={() => void refresh()}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {history === null || history.length === 0
          ? historyEmptyState()
          : history.map((row) => {
              const project = byId(row.summaryKey);
              return (
                <ReleaseCard
                  key={row.releaseId}
                  gradient={[row.gradientFrom, row.gradientTo]}
                  initials={row.initials}
                  title={row.title}
                  onTitleClick={
                    project ? () => navigate(`project/${project.id}`) : undefined
                  }
                  version={row.versionNumber}
                  meta={[
                    new Date(row.publishedAt).toLocaleString(),
                    row.cohort,
                    `published by ${row.publishedBy ?? "—"}`,
                    ...(row.note ? [row.note] : []),
                  ].join(" · ")}
                  state={row.state}
                  actions={
                    row.state === "Live" ? (
                      <PrimaryButton
                        small
                        variant="light"
                        label="Correction…"
                        onClick={() =>
                          notify(
                            "Material corrections require impact preview: 2 learning stacks, 1 open market, 14 saved items affected",
                          )
                        }
                      />
                    ) : null
                  }
                />
              );
            })}
      </div>

      <Card style={{ marginTop: 18, padding: 14, background: "var(--paper-muted)", border: "none" }}>
        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
          <b>Publication rule.</b> Final preflight runs immediately before release; material
          source, rights, asset, or dependency changes invalidate affected approvals.
          Rollback creates a new release decision pointing at an approved version — it never
          erases the failed release or its audit history.
        </div>
      </Card>
    </div>
  );
}

function ReleaseCard({
  gradient,
  initials,
  title,
  onTitleClick,
  version,
  meta,
  state,
  actions,
}: {
  gradient: string[];
  initials: string;
  title: string;
  onTitleClick?: () => void;
  version: number;
  meta: string;
  state: string;
  actions?: ReactNode;
}) {
  return (
    <Card style={{ padding: 15 }}>
      <Row gap={13} align="flex-start">
        <span
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--white)",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {initials}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Row gap={8} wrap>
            <span
              className="display"
              style={{ fontSize: 16, cursor: onTitleClick ? "pointer" : "default" }}
              onClick={onTitleClick}
            >
              {title}
            </span>
            <span
              className="pill"
              style={{ background: "var(--paper-muted)", color: "var(--muted)" }}
            >
              v{version} · immutable
            </span>
          </Row>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{meta}</div>
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}
        >
          <StatusPill value={state} />
          {actions ? <Row gap={6}>{actions}</Row> : null}
        </div>
      </Row>
    </Card>
  );
}
