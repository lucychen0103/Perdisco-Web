import { useMemo, useState } from "react";
import { useApp } from "../state";
import type { LifecycleState, SourceFormat } from "../types";
import { Card, EmptyState, Eyebrow, Row, StatusPill } from "../ui";

const LIFECYCLES: (LifecycleState | "All")[] = [
  "All",
  "Draft",
  "Processing",
  "Blocked",
  "In review",
  "Changes requested",
  "Approved",
  "Scheduled",
  "Published",
];

const FORMATS: (SourceFormat | "All")[] = [
  "All",
  "Podcast",
  "Video",
  "Interview",
  "Article",
  "Research paper",
];

export function ProjectsPage() {
  const { projects, navigate, findings } = useApp();
  const [lifecycle, setLifecycle] = useState<(typeof LIFECYCLES)[number]>("All");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("All");

  const filtered = useMemo(
    () =>
      projects.filter(
        (project) =>
          (lifecycle === "All" || project.state === lifecycle) &&
          (format === "All" || project.format === format),
      ),
    [projects, lifecycle, format],
  );

  return (
    <div style={{ maxWidth: 1060 }}>
      <Eyebrow>Projects</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        Source projects
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
        Every source and everything derived from it — one container per source, one
        accountable owner.
      </div>

      <Row gap={6} wrap style={{ marginTop: 20 }}>
        {LIFECYCLES.map((state) => (
          <button
            key={state}
            onClick={() => setLifecycle(state)}
            className="pill"
            style={{
              padding: "8px 13px",
              fontSize: 10,
              background: lifecycle === state ? "var(--forest)" : "var(--paper)",
              color: lifecycle === state ? "var(--white)" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            {state}
          </button>
        ))}
      </Row>
      <Row gap={6} wrap style={{ marginTop: 8 }}>
        {FORMATS.map((item) => (
          <button
            key={item}
            onClick={() => setFormat(item)}
            className="pill"
            style={{
              padding: "7px 12px",
              fontSize: 10,
              background: format === item ? "var(--lime-dark)" : "var(--paper)",
              color: format === item ? "var(--white)" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            {item}
          </button>
        ))}
      </Row>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <EmptyState
            title={projects.length === 0 ? "No source projects yet" : "No projects match these filters"}
            detail={
              projects.length === 0
                ? "Use Create source project in the sidebar to start with source identity, ownership, and rights basis."
                : "Clear a filter to see the rest of the workspace."
            }
          />
        ) : null}
        {filtered.map((project) => {
          const openFindings = findings.filter(
            (finding) => finding.projectId === project.id && finding.state === "Open",
          ).length;
          return (
            <Card
              key={project.id}
              onClick={() => navigate(`project/${project.id}`)}
              style={{ display: "flex", alignItems: "center", gap: 15, padding: 15 }}
            >
              <span
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 17,
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${project.gradient[0]}, ${project.gradient[1]})`,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--white)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {project.initials}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Row gap={8}>
                  <span
                    className="eyebrow"
                    style={{ fontSize: 8.5, color: "var(--muted)" }}
                  >
                    {project.format} · {project.category} · {project.duration}
                  </span>
                </Row>
                <div
                  className="display"
                  style={{
                    fontSize: 18,
                    lineHeight: "23px",
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  {project.creator} · {project.publisher} · owner {project.owner} · v
                  {project.version} · updated {project.updatedAt}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <StatusPill value={project.state} />
                <div style={{ display: "flex", gap: 5 }}>
                  {project.rights.status !== "Cleared" ? (
                    <StatusPill value={project.rights.status} />
                  ) : null}
                  {openFindings > 0 ? (
                    <span
                      className="pill"
                      style={{ background: "var(--peach)", color: "var(--peach-dark)" }}
                    >
                      {openFindings} finding{openFindings > 1 ? "s" : ""}
                    </span>
                  ) : null}
                  {project.blockers.length > 0 ? (
                    <span
                      className="pill"
                      style={{ background: "var(--danger-fill)", color: "var(--danger)" }}
                    >
                      {project.blockers.length} blocker{project.blockers.length > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
                <span style={{ fontSize: 10, color: "var(--subtle)" }}>
                  Target {project.targetRelease}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
