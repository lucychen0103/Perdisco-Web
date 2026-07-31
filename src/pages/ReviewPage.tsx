import { useMemo, useState } from "react";
import { useApp } from "../state";
import type { GateName } from "../types";
import { Card, EmptyState, Eyebrow, PrimaryButton, Row, StatusPill } from "../ui";

const GATE_FILTERS: (GateName | "All gates")[] = [
  "All gates",
  "Editorial fidelity",
  "Evidence & research",
  "Rights & source use",
  "Learning quality",
  "Community",
  "Market",
  "Accessibility & technical",
];

export function ReviewPage() {
  const { projects, findings, navigate, setGate, notify, setFindingState } = useApp();
  const [gateFilter, setGateFilter] = useState<(typeof GATE_FILTERS)[number]>("All gates");

  const queue = useMemo(() => {
    const rows: {
      projectId: string;
      title: string;
      gate: GateName;
      status: string;
      reviewer?: string;
      note?: string;
    }[] = [];
    projects.forEach((project) => {
      project.gates.forEach((gate) => {
        if (gate.status === "In review" || gate.status === "Changes requested" || gate.status === "Blocked") {
          rows.push({
            projectId: project.id,
            title: project.shortTitle,
            gate: gate.name,
            status: gate.status,
            reviewer: gate.reviewer,
            note: gate.note,
          });
        }
      });
    });
    return rows.filter((row) => gateFilter === "All gates" || row.gate === gateFilter);
  }, [projects, gateFilter]);

  const openFindings = findings.filter((finding) => finding.state === "Open");

  return (
    <div style={{ maxWidth: 1000 }}>
      <Eyebrow>Review</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        Approval queues
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
        Each gate is a named approval. Changes requested invalidates only the affected
        approvals; findings attach to exact fields.
      </div>

      <Row gap={6} wrap style={{ marginTop: 18 }}>
        {GATE_FILTERS.map((gate) => (
          <button
            key={gate}
            onClick={() => setGateFilter(gate)}
            className="pill"
            style={{
              padding: "8px 13px",
              fontSize: 10,
              background: gateFilter === gate ? "var(--forest)" : "var(--paper)",
              color: gateFilter === gate ? "var(--white)" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            {gate}
          </button>
        ))}
      </Row>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {queue.length === 0 ? (
          <EmptyState title="Queue clear" detail="No active review gates match this filter." />
        ) : (
          queue.map((row) => (
            <Card
              key={`${row.projectId}-${row.gate}`}
              style={{ display: "flex", alignItems: "center", gap: 13, padding: 14 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {row.gate} · <span style={{ color: "var(--forest)" }}>{row.title}</span>
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
                  {row.reviewer ? `Reviewer ${row.reviewer}` : "Unassigned"}
                  {row.note ? ` · ${row.note}` : ""}
                </div>
              </div>
              <StatusPill value={row.status} />
              <PrimaryButton
                small
                variant="light"
                label="Open project"
                onClick={() => navigate(`project/${row.projectId}`)}
              />
              {row.status === "In review" ? (
                <PrimaryButton
                  small
                  label="Approve"
                  onClick={() => {
                    setGate(row.projectId, row.gate, "Approved", "Lucy Chen");
                    notify(`${row.gate} approved for ${row.title}`);
                  }}
                />
              ) : null}
            </Card>
          ))
        )}
      </div>

      <Eyebrow style={{ marginTop: 30, marginBottom: 10 }}>
        Open findings across projects
      </Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {openFindings.length === 0 ? (
          <EmptyState title="No open findings" detail="Resolved findings await reviewer verification." />
        ) : (
          openFindings.map((finding) => (
            <Card key={finding.id} style={{ padding: 13 }}>
              <Row gap={8} wrap>
                <StatusPill value={finding.severity} />
                <span className="eyebrow" style={{ fontSize: 8.5, color: "var(--muted)" }}>
                  {finding.gate} · {finding.target}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--subtle)" }}>
                  {finding.author} · {finding.createdAt}
                </span>
              </Row>
              <div style={{ fontSize: 12.5, marginTop: 7, lineHeight: 1.5 }}>{finding.note}</div>
              <Row gap={8} style={{ marginTop: 10 }}>
                <PrimaryButton
                  small
                  variant="light"
                  label="Open project"
                  onClick={() => navigate(`project/${finding.projectId}`)}
                />
                <PrimaryButton
                  small
                  variant="light"
                  label="Mark resolved"
                  onClick={() => {
                    setFindingState(finding.id, "Resolved");
                    notify("Finding resolved — reviewer will re-verify");
                  }}
                />
              </Row>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
