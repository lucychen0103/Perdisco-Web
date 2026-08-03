import { RefreshCcw, RotateCcw } from "lucide-react";
import { useApp } from "../state";
import { PublishPanel } from "./PublishPanel";
import { Card, EmptyState, Eyebrow, PrimaryButton, Row, Stat, StatusPill } from "../ui";

export function PublishingPage() {
  const { releases, projects, navigate, updateRelease, notify } = useApp();

  const byId = (id: string) => projects.find((project) => project.id === id);
  const live = releases.filter((release) => release.state === "Live").length;
  const scheduled = releases.filter((release) => release.state === "Scheduled").length;
  const failed = releases.filter((release) => release.state === "Failed").length;

  return (
    <div style={{ maxWidth: 1000 }}>
      <Eyebrow>Publishing</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        Releases
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
        Only immutable approved versions publish. A release succeeds when clients can
        retrieve and render the intended version and health checks pass.
      </div>

      <div style={{ marginTop: 20 }}>
        <PublishPanel />
      </div>

      <Row gap={12} wrap style={{ marginTop: 20 }}>
        <Stat label="Live" value={live} tone="ok" hint="Serving all clients" />
        <Stat label="Scheduled" value={scheduled} hint="Awaiting release window" />
        <Stat
          label="Failed"
          value={failed}
          tone={failed ? "danger" : "ok"}
          hint="Retry or roll back"
        />
        <Stat label="Rollback eligible" value={1} hint="Approved prior versions" />
      </Row>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        {releases.length === 0 ? (
          <EmptyState
            title="No releases yet"
            detail="A release appears here once an approved version is scheduled or published from a project."
          />
        ) : null}
        {releases.map((release) => {
          const project = byId(release.projectId);
          if (!project) return null;
          return (
            <Card key={release.id} style={{ padding: 15 }}>
              <Row gap={13} align="flex-start">
                <span
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${project.gradient[0]}, ${project.gradient[1]})`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--white)",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {project.initials}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Row gap={8} wrap>
                    <span
                      className="display"
                      style={{ fontSize: 16, cursor: "pointer" }}
                      onClick={() => navigate(`project/${project.id}`)}
                    >
                      {project.title}
                    </span>
                    <span
                      className="pill"
                      style={{ background: "var(--paper-muted)", color: "var(--muted)" }}
                    >
                      v{release.version} · immutable
                    </span>
                  </Row>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    {release.when} · {release.cohort} · published by {release.publisher}
                    {release.note ? ` · ${release.note}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <Row gap={6}>
                    <StatusPill value={release.state} />
                    {release.health !== "—" ? (
                      <span
                        className="pill"
                        style={{
                          background:
                            release.health === "Healthy" ? "var(--lime)" : "var(--danger-fill)",
                          color:
                            release.health === "Healthy"
                              ? "var(--lime-dark)"
                              : "var(--danger)",
                        }}
                      >
                        {release.health}
                      </span>
                    ) : null}
                  </Row>
                  <Row gap={6}>
                    {release.state === "Failed" ? (
                      <>
                        <PrimaryButton
                          small
                          icon={<RefreshCcw size={12} />}
                          label="Retry"
                          onClick={() => {
                            updateRelease(release.id, { state: "Publishing", health: "—" });
                            notify("Final preflight running — release retrying");
                            setTimeout(() => {
                              updateRelease(release.id, { state: "Failed", health: "Failing" });
                              notify("Retry failed: anchor map still missing s3 — fix in composer preflight");
                            }, 2600);
                          }}
                        />
                        <PrimaryButton
                          small
                          variant="light"
                          icon={<RotateCcw size={12} />}
                          label="Roll back"
                          onClick={() => {
                            updateRelease(release.id, { state: "Rolled back", health: "—" });
                            notify("Rollback release created toward last approved version — protected action logged");
                          }}
                        />
                      </>
                    ) : null}
                    {release.state === "Live" ? (
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
                    ) : null}
                    {release.state === "Scheduled" ? (
                      <PrimaryButton
                        small
                        variant="light"
                        label="Release now"
                        onClick={() => {
                          updateRelease(release.id, { state: "Live", health: "Healthy" });
                          notify("Release live — client availability verified");
                        }}
                      />
                    ) : null}
                  </Row>
                </div>
              </Row>
            </Card>
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
