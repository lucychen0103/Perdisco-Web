import { useState } from "react";
import { useApp } from "../state";
import { Card, EmptyState, Eyebrow, PrimaryButton, Row, Stat, StatusPill } from "../ui";

export function MarketsPage() {
  const { markets, projects, updateMarket, notify, navigate } = useApp();
  const [resolving, setResolving] = useState<string | undefined>();

  const totalCommitted = markets.reduce((sum, market) => sum + market.committedTokens, 0);

  return (
    <div style={{ maxWidth: 1000 }}>
      <Eyebrow>Markets</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        Prediction operations
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
        Creating a market never opens it. Opening, closing, resolving, and voiding are
        separate protected actions; criteria freeze at open. Tokens have no cash value.
      </div>

      <Row gap={12} wrap style={{ marginTop: 20 }}>
        <Stat label="Open markets" value={markets.filter((m) => m.state === "Open").length} tone="ok" hint="Monitored hourly" />
        <Stat
          label="Awaiting resolution"
          value={markets.filter((m) => m.state === "Awaiting resolution").length}
          tone="warn"
          hint="Evidence due"
        />
        <Stat label="Committed tokens" value={totalCommitted.toLocaleString()} hint="Append-only ledger" />
        <Stat label="Disputes" value={markets.filter((m) => m.state === "Disputed").length} tone="ok" hint="None open" />
      </Row>

      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        {markets.length === 0 ? (
          <EmptyState
            title="No prediction markets"
            detail="Add a Prediction activity to a summary document, then send it here for review before it can open."
          />
        ) : null}
        {markets.map((market) => {
          const project = projects.find((item) => item.id === market.projectId);
          const isResolving = resolving === market.id;
          return (
            <Card key={market.id} style={{ padding: 15 }}>
              <Row gap={10} align="flex-start" wrap>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <Row gap={8} wrap>
                    <StatusPill value={market.state} />
                    {market.flag ? (
                      <span className="pill" style={{ background: "var(--danger-fill)", color: "var(--danger)" }}>
                        {market.flag}
                      </span>
                    ) : null}
                  </Row>
                  <div className="display" style={{ fontSize: 18, lineHeight: "24px", marginTop: 8 }}>
                    {market.question}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    {project ? (
                      <button
                        onClick={() => navigate(`project/${project.id}`)}
                        style={{ color: "var(--forest)", fontWeight: 600 }}
                      >
                        {project.shortTitle}
                      </button>
                    ) : (
                      "—"
                    )}{" "}
                    · statement {market.statementId} · closes {market.closes} · resolves{" "}
                    {market.resolves} · resolver {market.resolver}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                    Rule: {market.rule}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, minWidth: 180 }}>
                  <div className="display" style={{ fontSize: 24, color: "var(--forest)" }}>
                    {market.communityProbability > 0 ? `${market.communityProbability}%` : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--subtle)", textAlign: "right" }}>
                    {market.committedTokens.toLocaleString()} tokens · {market.participants}{" "}
                    participants
                    <br />
                    {market.concentration}
                  </div>
                  <Row gap={6} style={{ marginTop: 5 }}>
                    {market.state === "Draft" ? (
                      <PrimaryButton
                        small
                        variant="light"
                        label="Send to review"
                        onClick={() => {
                          updateMarket(market.id, { state: "In review" });
                          notify("Market sent to review — safety and criteria checks assigned");
                        }}
                      />
                    ) : null}
                    {market.state === "In review" ? (
                      <PrimaryButton
                        small
                        label="Approve & open"
                        onClick={() => {
                          if (market.flag) {
                            notify("Cannot open — blocker finding must be resolved first");
                            return;
                          }
                          updateMarket(market.id, { state: "Open" });
                          notify("Market opened — resolution criteria now immutable");
                        }}
                      />
                    ) : null}
                    {market.state === "Awaiting resolution" && !isResolving ? (
                      <PrimaryButton small label="Resolve…" onClick={() => setResolving(market.id)} />
                    ) : null}
                  </Row>
                </div>
              </Row>

              {isResolving ? (
                <div
                  style={{
                    marginTop: 13,
                    paddingTop: 13,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <Eyebrow style={{ fontSize: 8.5, color: "var(--muted)", marginBottom: 8 }}>
                    Protected resolution · requires documented evidence from {market.resolutionSource}
                  </Eyebrow>
                  <Row gap={8} wrap>
                    <PrimaryButton
                      small
                      label="Resolve YES"
                      onClick={() => {
                        updateMarket(market.id, { state: "Resolved" });
                        setResolving(undefined);
                        notify("Resolved YES — positions calculated, ledger events written, audit recorded");
                      }}
                    />
                    <PrimaryButton
                      small
                      variant="lime"
                      label="Resolve NO"
                      onClick={() => {
                        updateMarket(market.id, { state: "Resolved" });
                        setResolving(undefined);
                        notify("Resolved NO — positions calculated, ledger events written, audit recorded");
                      }}
                    />
                    <PrimaryButton
                      small
                      variant="danger"
                      label="Void market"
                      onClick={() => {
                        updateMarket(market.id, { state: "Void" });
                        setResolving(undefined);
                        notify("Market voided — all stakes refunded through ledger, reason required");
                      }}
                    />
                    <PrimaryButton
                      small
                      variant="light"
                      label="Escalate dispute"
                      onClick={() => {
                        updateMarket(market.id, { state: "Disputed" });
                        setResolving(undefined);
                        notify("Escalated — second resolver review required");
                      }}
                    />
                    <PrimaryButton small variant="light" label="Cancel" onClick={() => setResolving(undefined)} />
                  </Row>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
