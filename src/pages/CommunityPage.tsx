import { useState } from "react";
import { useApp } from "../state";
import { Card, EmptyState, Eyebrow, PrimaryButton, Row, Stat, StatusPill } from "../ui";

const ACTIONS = ["Hide", "Restore", "Remove", "Warn", "Mute", "Lock thread", "Escalate"] as const;

export function CommunityPage() {
  const { cases, projects, updateCase, notify, navigate } = useApp();
  const [selectedId, setSelectedId] = useState<string | undefined>(cases[0]?.id);

  const selected = cases.find((item) => item.id === selectedId);
  const project = selected
    ? projects.find((item) => item.id === selected.projectId)
    : undefined;
  const open = cases.filter((item) => item.status === "New" || item.status === "In review");

  return (
    <div style={{ maxWidth: 1060 }}>
      <Eyebrow>Community</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        Moderation
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
        AI prioritizes the queue; enforcement stays attributable, reviewable, and
        appealable. Every case keeps its exact editorial context.
      </div>

      <Row gap={12} wrap style={{ marginTop: 20 }}>
        <Stat label="Open cases" value={open.length} tone={open.length ? "warn" : "ok"} hint="Within SLA" />
        <Stat
          label="High severity"
          value={cases.filter((item) => item.severity === "High" && item.status !== "Closed").length}
          tone="danger"
          hint="4-hour service target"
        />
        <Stat label="Appeals" value={cases.filter((item) => item.kind === "Appeal").length} hint="Second review required" />
        <Stat label="Closed this week" value={cases.filter((item) => item.status === "Closed").length} tone="ok" hint="Quality sampled" />
      </Row>

      <div style={{ display: "flex", gap: 18, marginTop: 22, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 340, display: "flex", flexDirection: "column", gap: 8 }}>
          {cases.length === 0 ? (
            <EmptyState
              title="No moderation cases"
              detail="Reports, appeals, and account reviews arrive here once published sources have discussion."
            />
          ) : null}
          {cases.map((item) => (
            <Card
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              style={{
                padding: 13,
                border:
                  selectedId === item.id ? "2px solid var(--forest)" : "1px solid var(--line)",
              }}
            >
              <Row gap={8} wrap>
                <StatusPill value={item.severity} />
                <span className="eyebrow" style={{ fontSize: 8.5, color: "var(--muted)" }}>
                  {item.kind} · {item.reports} report{item.reports > 1 ? "s" : ""} · SLA {item.slaHours}h
                </span>
                <span style={{ marginLeft: "auto" }}>
                  <StatusPill value={item.status} />
                </span>
              </Row>
              <div
                style={{
                  fontSize: 12.5,
                  marginTop: 7,
                  fontStyle: "italic",
                  color: "var(--ink)",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                “{item.excerpt}”
              </div>
              <div style={{ fontSize: 10, color: "var(--subtle)", marginTop: 5 }}>
                {item.reportedUser} · {item.aiSignal}
              </div>
            </Card>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 360, position: "sticky", top: 86 }}>
          {selected && project ? (
            <Card style={{ padding: 16 }}>
              <Eyebrow style={{ fontSize: 9 }}>Case record · {selected.id}</Eyebrow>
              <div className="display" style={{ fontSize: 20, marginTop: 5 }}>
                {selected.kind} on {project.shortTitle}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                {selected.statementId
                  ? `Statement-level thread · ${selected.statementId}`
                  : "Source-level thread"}{" "}
                ·{" "}
                <button
                  onClick={() => navigate(`project/${project.id}`)}
                  style={{ color: "var(--forest)", fontWeight: 600 }}
                >
                  Open editorial context
                </button>
              </div>

              <div
                style={{
                  marginTop: 13,
                  padding: 13,
                  borderRadius: 14,
                  background: "var(--paper-muted)",
                  fontSize: 13,
                  fontStyle: "italic",
                  lineHeight: 1.55,
                }}
              >
                “{selected.excerpt}”
                <div style={{ fontSize: 10, fontStyle: "normal", color: "var(--muted)", marginTop: 7 }}>
                  {selected.reportedUser} · {selected.reports} reports
                </div>
              </div>

              <div style={{ marginTop: 13 }}>
                <Eyebrow style={{ fontSize: 8.5, color: "var(--muted)", marginBottom: 6 }}>
                  Assessment
                </Eyebrow>
                <div style={{ fontSize: 11.5, lineHeight: 1.6 }}>
                  AI signals: {selected.aiSignal}. Assigned to {selected.assignee ?? "unassigned"}.
                  Applicable policy and prior history load with the case; enforcement requires a
                  reason and produces a user notice plus audit event.
                </div>
              </div>

              <Row gap={6} wrap style={{ marginTop: 14 }}>
                {ACTIONS.map((action) => (
                  <button
                    key={action}
                    className="pill"
                    onClick={() => {
                      updateCase(selected.id, { status: "Actioned", assignee: "Lucy Chen" });
                      notify(`${action} applied — reason recorded, appeal window opened`);
                    }}
                    style={{
                      padding: "9px 13px",
                      fontSize: 10,
                      background:
                        action === "Remove" || action === "Escalate"
                          ? "var(--danger-fill)"
                          : "var(--paper)",
                      color:
                        action === "Remove" || action === "Escalate"
                          ? "var(--danger)"
                          : "var(--forest)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {action}
                  </button>
                ))}
              </Row>
              {selected.kind === "Appeal" ? (
                <Row gap={8} style={{ marginTop: 12 }}>
                  <PrimaryButton
                    small
                    label="Uphold appeal — restore"
                    onClick={() => {
                      updateCase(selected.id, { status: "Closed" });
                      notify("Appeal upheld — content restored, original action reversed in audit");
                    }}
                  />
                  <PrimaryButton
                    small
                    variant="light"
                    label="Deny appeal"
                    onClick={() => {
                      updateCase(selected.id, { status: "Closed" });
                      notify("Appeal denied — second reviewer recorded");
                    }}
                  />
                </Row>
              ) : null}
            </Card>
          ) : (
            <EmptyState title="Select a case" detail="Case records keep context, assessment, action, review, and audit together." />
          )}
        </div>
      </div>
    </div>
  );
}
