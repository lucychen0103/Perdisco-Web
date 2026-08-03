import { useState } from "react";
import { auditEvents, people } from "../data";
import { PREDICTION_MARKETS_ENABLED } from "../flags";
import { useApp } from "../state";
import { Avatar, Card, Eyebrow, PrimaryButton, Row, StatusPill } from "../ui";

const TABS = ["People & roles", "Organizations", "Taxonomies", "Feature controls", "Audit log"] as const;

const featureFlags = [
  { name: "Comments", scope: "Per release", state: true, note: "Independent of publish state" },
  { name: "Learning activities", scope: "Per release", state: true, note: "Answer keys require approval" },
  { name: "Predictions & tokens", scope: "Per release + country", state: PREDICTION_MARKETS_ENABLED, note: "Disabled with prediction markets — cut from consumer v1" },
  { name: "Embedded media playback", scope: "Per rights record", state: true, note: "Driven by rights, not URLs" },
  { name: "Creator submissions", scope: "Platform", state: false, note: "Deferred — organizations model ready" },
  { name: "Public preview links", scope: "Platform", state: false, note: "V1 uses expiring internal links only" },
];

const categories = [
  "ROBOTICS",
  "AI SYSTEMS",
  "BIOTECH",
  "STARTUPS",
  "ENERGY",
  "MEDIA",
  "ECONOMICS",
  "HEALTH",
];

export function AdminPage() {
  const { notify } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("People & roles");

  return (
    <div style={{ maxWidth: 940 }}>
      <Eyebrow>Administration</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        People, policy & controls
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
        Access is invitation-only and evaluated server-side by organization, workspace,
        role, object state, and risk — not by hiding navigation.
      </div>

      <Row gap={6} wrap style={{ marginTop: 18, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
        {TABS.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className="pill"
            style={{
              padding: "9px 14px",
              fontSize: 10,
              background: tab === item ? "var(--forest)" : "var(--paper)",
              color: tab === item ? "var(--white)" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            {item}
          </button>
        ))}
      </Row>

      {tab === "People & roles" ? (
        <div style={{ marginTop: 18 }}>
          <Row style={{ justifyContent: "flex-end", marginBottom: 12 }}>
            <PrimaryButton
              small
              label="Invite team member"
              onClick={() => notify("Invitation flow requires the approved identity provider + MFA")}
            />
          </Row>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {people.map((person) => (
              <Card
                key={person.id}
                style={{ display: "flex", alignItems: "center", gap: 13, padding: 13 }}
              >
                <Avatar initials={person.initials} size={38} tone={person.id === "lucy" ? "forest" : "paper"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{person.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
                    {person.email} · last active {person.lastActive}
                  </div>
                </div>
                <Row gap={5} wrap style={{ justifyContent: "flex-end", maxWidth: 320 }}>
                  {person.roles.map((role) => (
                    <span
                      key={role}
                      className="pill"
                      style={{ background: "var(--paper-muted)", color: "var(--forest)" }}
                    >
                      {role}
                    </span>
                  ))}
                  <StatusPill value={person.status} />
                </Row>
              </Card>
            ))}
          </div>
          <Card style={{ marginTop: 14, padding: 13, background: "var(--paper-muted)", border: "none" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
              <b>Role-combination policy.</b> One person may hold several roles, but the
              system records which role authorized each protected action. Publication,
              material correction, rights override, sanctions, token adjustments, and
              market resolution support configurable two-person approval.
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "Organizations" ? (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <Card style={{ padding: 15 }}>
            <Row gap={10}>
              <Avatar initials="PD" size={42} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Perdisco (internal)</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  1 workspace · Editorial — 6 members, 6 projects · owns all V1 content
                </div>
              </div>
              <StatusPill value="Active" />
            </Row>
          </Card>
          <Card style={{ padding: 15, opacity: 0.75 }}>
            <Row gap={10}>
              <Avatar initials="+" size={42} tone="paper" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Future creator organizations</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  Every project already belongs to an organization and workspace, with
                  separate source, project, editorial, publication, and rights owners —
                  creators arrive through permissions, not a new content model.
                </div>
              </div>
              <StatusPill value="Deferred" />
            </Row>
          </Card>
        </div>
      ) : null}

      {tab === "Taxonomies" ? (
        <div style={{ marginTop: 18 }}>
          <Eyebrow style={{ fontSize: 9, marginBottom: 10 }}>
            Domain categories · Learnify identifiers preserved
          </Eyebrow>
          <Row gap={6} wrap>
            {categories.map((category) => (
              <span
                key={category}
                className="pill"
                style={{ background: "var(--paper)", color: "var(--forest)", border: "1px solid var(--line)", padding: "9px 14px" }}
              >
                {category}
              </span>
            ))}
          </Row>
          <Eyebrow style={{ fontSize: 9, margin: "20px 0 10px" }}>Statement types · fixed vocabulary</Eyebrow>
          <Row gap={6} wrap>
            {(["FACT", "OPINION", "FORECAST", "MENTAL MODEL"] as const).map((type) => (
              <StatusPill key={type} value={type} />
            ))}
          </Row>
          <Card style={{ marginTop: 16, padding: 13, background: "var(--paper-muted)", border: "none" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
              Domain category stays separate from statement type. Category changes propagate
              to filters and analytics without breaking existing anchors.
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "Feature controls" ? (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {featureFlags.map((flag) => (
            <Card
              key={flag.name}
              style={{ display: "flex", alignItems: "center", gap: 13, padding: 13 }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{flag.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
                  Scope: {flag.scope} · {flag.note}
                </div>
              </div>
              <StatusPill value={flag.state ? "Active" : "Deferred"} />
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "Audit log" ? (
        <div style={{ marginTop: 18 }}>
          <Card style={{ padding: 6 }}>
            {auditEvents.map((event, index) => (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 13px",
                  borderBottom: index < auditEvents.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <span style={{ width: 92, flexShrink: 0, fontSize: 10, color: "var(--subtle)" }}>
                  {event.time}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {event.action} — {event.object}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
                    {event.detail} · {event.actor} acting as {event.role}
                  </div>
                </div>
                {event.protected ? (
                  <span className="pill" style={{ background: "var(--peach)", color: "var(--peach-dark)" }}>
                    Protected
                  </span>
                ) : null}
              </div>
            ))}
          </Card>
          <div style={{ fontSize: 10.5, color: "var(--subtle)", marginTop: 10 }}>
            Append-only. Users cannot delete or rewrite their own audit history. Export is a
            protected action.
          </div>
        </div>
      ) : null}
    </div>
  );
}
