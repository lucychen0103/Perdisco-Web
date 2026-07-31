import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Clock,
  Info,
} from "lucide-react";
import { alerts, auditEvents } from "../data";
import { useApp } from "../state";
import {
  Avatar,
  Card,
  EmptyState,
  Eyebrow,
  Row,
  SectionTitle,
  Stat,
  StatusPill,
} from "../ui";

export function HomePage() {
  const { projects, findings, cases, markets, releases, navigate } = useApp();

  const myWork = projects.filter((project) => project.owner === "Lucy Chen");
  const openFindings = findings.filter((finding) => finding.state === "Open");
  const openCases = cases.filter((item) => item.status === "New" || item.status === "In review");
  const dueMarkets = markets.filter(
    (market) => market.state === "Awaiting resolution" || market.state === "Disputed",
  );
  const blocked = projects.filter((project) => project.state === "Blocked");
  const failedReleases = releases.filter((release) => release.state === "Failed");
  const inReview = projects.filter(
    (project) => project.state === "In review" || project.state === "Changes requested",
  );

  return (
    <div style={{ maxWidth: 1060 }}>
      <Eyebrow>Home · Friday, July 31, 2026</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        Good morning, Lucy
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
        {myWork.length} projects assigned to you · {openFindings.length} open review findings ·{" "}
        {failedReleases.length} failed release needs attention
      </div>

      <Row gap={12} wrap style={{ marginTop: 22 }}>
        <Stat
          label="My projects"
          value={myWork.length}
          hint="Owned by you"
          onClick={() => navigate("projects")}
        />
        <Stat
          label="Awaiting review"
          value={inReview.length}
          hint="Across all gates"
          onClick={() => navigate("review")}
        />
        <Stat
          label="Blocked"
          value={blocked.length}
          tone={blocked.length ? "danger" : "ok"}
          hint="Named blockers with owners"
          onClick={() => navigate("projects")}
        />
        <Stat
          label="Moderation SLA"
          value={openCases.length}
          tone={openCases.some((c) => c.severity === "High") ? "warn" : undefined}
          hint="Open community cases"
          onClick={() => navigate("community")}
        />
        <Stat
          label="Markets due"
          value={dueMarkets.length}
          tone={dueMarkets.length ? "warn" : "ok"}
          hint="Awaiting resolution"
          onClick={() => navigate("markets")}
        />
      </Row>

      <SectionTitle
        eyebrow="Operational alerts"
        title="What needs attention first"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.length === 0 ? (
          <EmptyState
            title="Nothing needs attention"
            detail="Processing failures, rights expiry, failed releases, and high-risk reports surface here."
          />
        ) : null}
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            onClick={() => navigate(alert.destination)}
            style={{ display: "flex", alignItems: "center", gap: 13, padding: 14 }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  alert.tone === "danger"
                    ? "#F3DAD7"
                    : alert.tone === "warn"
                      ? "var(--peach)"
                      : "var(--blue)",
              }}
            >
              {alert.tone === "danger" ? (
                <CircleAlert size={17} color="var(--danger)" />
              ) : alert.tone === "warn" ? (
                <AlertTriangle size={17} color="var(--peach-dark)" />
              ) : (
                <Info size={17} color="var(--blue-dark)" />
              )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{alert.title}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {alert.detail}
              </div>
            </div>
            <ArrowRight size={16} color="var(--forest)" />
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 2, minWidth: 420 }}>
          <SectionTitle eyebrow="My work" title="Assigned to you" action="All projects" onAction={() => navigate("projects")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myWork.length === 0 ? (
              <EmptyState
                title="No projects assigned to you"
                detail="Create a source project from the sidebar to start the intake, composition, and review workflow."
              />
            ) : null}
            {myWork.map((project) => (
              <Card
                key={project.id}
                onClick={() => navigate(`project/${project.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 13, padding: 14 }}
              >
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${project.gradient[0]}, ${project.gradient[1]})`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--white)",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {project.initials}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {project.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
                    {project.format} · v{project.version} · target {project.targetRelease} ·
                    updated {project.updatedAt}
                  </div>
                </div>
                <StatusPill value={project.state} />
              </Card>
            ))}
          </div>

          <SectionTitle eyebrow="Team queues" title="Unassigned and overdue" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projects.filter((project) => project.owner !== "Lucy Chen").length === 0 ? (
              <EmptyState
                title="No team items"
                detail="Unassigned, overdue, and blocked work owned by others appears here."
              />
            ) : null}
            {projects
              .filter((project) => project.owner !== "Lucy Chen")
              .map((project) => (
                <Card
                  key={project.id}
                  onClick={() => navigate(`project/${project.id}`)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 13 }}
                >
                  <Avatar
                    initials={project.owner
                      .split(" ")
                      .map((word) => word[0])
                      .join("")}
                    size={30}
                    tone="paper"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {project.title}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                      {project.owner} · {project.priority} priority · {project.updatedAt}
                    </div>
                  </div>
                  <StatusPill value={project.state} />
                </Card>
              ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          <SectionTitle eyebrow="Recent activity" title="Watched changes" />
          <Card style={{ padding: 6 }}>
            {auditEvents.length === 0 ? (
              <div style={{ padding: 14, fontSize: 11.5, color: "var(--muted)" }}>
                No recorded activity yet. Protected actions and edits appear here with the
                actor, role, and time.
              </div>
            ) : null}
            {auditEvents.slice(0, 6).map((event, index) => (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  gap: 11,
                  padding: "11px 12px",
                  borderBottom:
                    index < 5 ? "1px solid var(--line)" : "none",
                }}
              >
                <Clock size={14} color="var(--subtle)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700 }}>
                    {event.action}
                    {event.protected ? (
                      <span
                        className="pill"
                        style={{
                          marginLeft: 7,
                          background: "var(--paper-muted)",
                          color: "var(--muted)",
                          fontSize: 8,
                        }}
                      >
                        Protected
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                    {event.object}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--subtle)", marginTop: 2 }}>
                    {event.actor} as {event.role} · {event.time}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
