import {
  ArrowUpRight,
  Bookmark,
  ChevronLeft,
  MoreHorizontal,
  Play,
} from "lucide-react";
import { elaborationBlocksOf } from "../lib/elaboration";
import type {
  ActivityDraft,
  ActivityMode,
  AdminMarket,
  AdminStatement,
  SourceProject,
  SummaryBlock,
} from "../types";
import { typeVisuals } from "../ui";

/**
 * Pixel-faithful recreation of the consumer app's Nocturne summary and
 * elaboration screens (app/summary/[id].tsx and app/statement/[id].tsx) so
 * editors compose against the exact experience users receive.
 */

const serif = "var(--font-display)";

const modeColors: Record<ActivityMode, string> = {
  Flashcard: "var(--champagne)",
  "Applied quiz": "var(--aqua)",
  Matching: "var(--lilac)",
  Poll: "var(--aqua-light)",
  Prediction: "var(--rose)",
};

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 375,
        height: 720,
        borderRadius: 44,
        border: "10px solid var(--ground-deep)",
        background:
          "radial-gradient(110% 62% at 8% 0%, rgba(127,211,217,0.2), transparent 60%), radial-gradient(90% 55% at 100% 100%, rgba(156,30,93,0.36), transparent 62%), var(--ground)",
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 20px 50px rgba(2, 20, 25, 0.5)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110,
          height: 22,
          borderRadius: 12,
          background: "var(--ground-deep)",
          zIndex: 5,
        }}
      />
      <div style={{ height: "100%", overflowY: "auto", paddingTop: 34 }}>{children}</div>
    </div>
  );
}

export function SummaryPreview({
  project,
  statements,
  activities,
  markets = [],
  focusedId,
  onSelect,
}: {
  project: SourceProject;
  statements: AdminStatement[];
  activities: ActivityDraft[];
  markets?: AdminMarket[];
  focusedId?: string;
  onSelect?: (blockId: string) => void;
}) {
  const statementFor = (block: Extract<SummaryBlock, { kind: "statement" }>) =>
    statements.find((statement) => statement.id === block.statementId);
  const activityFor = (block: Extract<SummaryBlock, { kind: "activity" }>) =>
    activities.find((activity) => activity.id === block.activityId);
  const learningCount = statements.filter((statement) => statement.learningEligible).length;

  const statementBlocks = project.blocks.filter(
    (block) => block.kind === "statement",
  );
  const lastStatementBlockId = statementBlocks[statementBlocks.length - 1]?.id;

  return (
    <div>
      <div
        style={{
          minHeight: 50,
          padding: "6px 16px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <ChevronLeft size={18} color="var(--ink-soft)" strokeWidth={1.8} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
          <Bookmark size={16} color="var(--ink-soft)" strokeWidth={1.8} />
          <ArrowUpRight size={16} color="var(--champagne)" strokeWidth={1.8} />
        </span>
      </div>

      <div style={{ padding: "6px 17px 50px" }}>
        <div
          style={{
            height: 92,
            borderRadius: 18,
            padding: 12,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            background: `linear-gradient(135deg, ${project.gradient[0]}, ${project.gradient[1]})`,
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
            }}
          >
            {project.initials}
          </span>
        </div>

        <div style={{ marginTop: 14 }}>
          <MicroLabel>
            {project.format.toUpperCase()} · {project.duration.toUpperCase()} ·{" "}
            {project.category.toUpperCase()}
          </MicroLabel>
        </div>
        <div
          style={{
            color: "var(--ink)",
            fontFamily: serif,
            fontSize: 26,
            lineHeight: 1.14,
            letterSpacing: "-0.01em",
            marginTop: 8,
          }}
        >
          {project.title || "Untitled source"}
        </div>
        <div
          style={{
            color: "var(--muted)",
            fontFamily: serif,
            fontSize: 14,
            marginTop: 6,
          }}
        >
          {project.creator}
          {project.creatorRole && project.creatorRole !== "—"
            ? ` · ${project.creatorRole}`
            : ""}
        </div>

        <div style={{ paddingTop: 8 }}>
          {project.blocks.map((block) => {
            if (block.kind === "text") {
              return <Prose key={block.id}>{block.text}</Prose>;
            }
            if (block.kind === "statement") {
              const statement = statementFor(block);
              if (!statement) return null;
              const visual = typeVisuals[statement.type];
              const focused = focusedId === block.id;
              return (
                <button
                  key={block.id}
                  onClick={() => onSelect?.(block.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    padding: "13px 4px",
                    borderTop: "1px solid var(--hairline)",
                    borderBottom:
                      block.id === lastStatementBlockId
                        ? "1px solid var(--hairline)"
                        : "none",
                    background: focused ? "rgba(227,192,141,0.1)" : "transparent",
                    borderRadius: focused ? 10 : 0,
                    cursor: onSelect ? "pointer" : "default",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginTop: 6,
                      background: visual.strong,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: focused ? "var(--champagne-bright)" : "var(--ink)",
                      fontFamily: serif,
                      fontSize: 15,
                      lineHeight: 1.4,
                    }}
                  >
                    {statement.text}
                  </span>
                </button>
              );
            }
            const activity = activityFor(block);
            if (!activity) return null;
            return (
              <ActivityCard
                key={block.id}
                activity={activity}
                market={markets.find((market) => market.id === activity.marketId)}
                focused={focusedId === block.id}
                onClick={onSelect ? () => onSelect(block.id) : undefined}
              />
            );
          })}
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 12,
            background: "var(--panel)",
            padding: "12px 14px",
          }}
        >
          <div style={{ color: "var(--ink-soft)", fontFamily: serif, fontSize: 13 }}>
            Add this summary to your learning stack
          </div>
          <div
            style={{
              color: "var(--label)",
              fontSize: 8,
              letterSpacing: 1.4,
              marginTop: 4,
            }}
          >
            {learningCount} ELIGIBLE IDEAS
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            minHeight: 46,
            borderRadius: 12,
            background: "var(--magenta)",
            color: "var(--magenta-on)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {project.medium === "audio" || project.medium === "video"
            ? "Listen from 00:00"
            : "Open the source"}
        </div>

        <div
          style={{
            marginTop: 14,
            padding: "10px 2px 0",
            borderTop: "1px solid var(--hairline)",
            color: "var(--label)",
            fontSize: 8,
            fontWeight: 500,
            letterSpacing: 1.4,
          }}
        >
          SOURCE DISCUSSION · {project.blocks.length > 0 ? "OPEN" : "NOT CONFIGURED"}
        </div>
      </div>
    </div>
  );
}

export function ElaborationPreview({
  project,
  statement,
  activities = [],
  markets = [],
}: {
  project: SourceProject;
  statement: AdminStatement;
  activities?: ActivityDraft[];
  markets?: AdminMarket[];
}) {
  const visual = typeVisuals[statement.type];
  const hasSupporting = Boolean(statement.supportingSource?.trim());
  const blocks = elaborationBlocksOf(statement, activities, project);
  const hasProse = blocks.some((block) => block.kind === "text" && block.text.trim());
  return (
    <div>
      <div
        style={{
          minHeight: 50,
          padding: "6px 16px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <ChevronLeft size={18} color="var(--ink-soft)" strokeWidth={1.8} />
        <MoreHorizontal size={18} color="var(--ink-soft)" strokeWidth={1.8} />
      </div>

      <div style={{ padding: "8px 17px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: visual.strong,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: visual.strong,
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {statement.type}
            {hasSupporting ? ` · ${statement.supportingSource.toUpperCase()}` : ""}
          </span>
        </div>

        <div
          style={{
            fontFamily: serif,
            fontSize: 23,
            lineHeight: 1.26,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
            marginTop: 14,
          }}
        >
          {statement.text}
        </div>

        {!hasProse ? (
          <div
            style={{
              fontFamily: serif,
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--muted-dim)",
              marginTop: 14,
            }}
          >
            No elaboration yet — this statement cannot publish as tappable.
          </div>
        ) : null}
        {blocks.map((block) => {
          if (block.kind === "text") {
            if (!block.text.trim()) return null;
            return (
              <div
                key={block.id}
                style={{
                  fontFamily: serif,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: "var(--muted)",
                  marginTop: 14,
                }}
              >
                {block.text}
              </div>
            );
          }
          const activity = activities.find((item) => item.id === block.activityId);
          if (!activity) return null;
          return (
            <ActivityCard
              key={block.id}
              activity={activity}
              market={markets.find((market) => market.id === activity.marketId)}
            />
          );
        })}

        <div
          style={{
            marginTop: 16,
            borderRadius: 18,
            padding: 18,
            background: "var(--quote-fill)",
            border: "1px solid var(--quote-border)",
          }}
        >
          <div
            style={{
              color: "var(--aqua-light)",
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: 2,
            }}
          >
            IN THE SOURCE{statement.locator ? ` · ${statement.locator.toUpperCase()}` : ""}
          </div>
          <div
            style={{
              fontFamily: serif,
              fontSize: 17,
              lineHeight: 1.48,
              color: "var(--ink)",
              marginTop: 10,
            }}
          >
            “{statement.sourceMoment}”
          </div>
          {project.medium === "audio" || project.medium === "video" ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 14,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: "var(--magenta)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Play size={13} color="var(--magenta-on)" fill="var(--magenta-on)" />
              </span>
              <span style={{ flex: 1 }}>
                <span
                  style={{
                    display: "block",
                    height: 3,
                    borderRadius: 2,
                    background: "rgba(234,246,245,0.18)",
                  }}
                />
              </span>
              <span style={{ color: "var(--label)", fontSize: 8, letterSpacing: 1 }}>
                {statement.locator || "0:00"}
              </span>
            </div>
          ) : null}
        </div>

        {hasSupporting ? (
          <div
            style={{
              marginTop: 14,
              minHeight: 40,
              borderRadius: 12,
              background: "var(--panel)",
              padding: "11px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span
              style={{
                color: "var(--ink-soft)",
                fontFamily: serif,
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {statement.supportingSource}
            </span>
            <ArrowUpRight size={13} color="var(--champagne)" strokeWidth={2} />
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <span
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              border: "1px solid var(--outline)",
              color: "var(--ink)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Save
          </span>
          <span
            style={{
              flex: 1.5,
              minHeight: 44,
              borderRadius: 12,
              background: "var(--champagne)",
              color: "var(--ground-deep)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Add to my stack
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  market,
  focused,
  onClick,
}: {
  activity: ActivityDraft;
  market?: AdminMarket;
  focused?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        borderRadius: 16,
        padding: 14,
        margin: "10px 0",
        background: "var(--panel)",
        border: focused ? "1px solid var(--champagne)" : "1px solid var(--hairline)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            color: modeColors[activity.mode],
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: 2,
          }}
        >
          {activity.mode.toUpperCase()}
        </span>
        {activity.reward ? (
          <span
            style={{
              background: "rgba(227,192,141,0.14)",
              color: "var(--champagne)",
              borderRadius: 10,
              padding: "3px 8px",
              fontSize: 8,
              fontWeight: 600,
              letterSpacing: 1.2,
            }}
          >
            +{activity.reward} POINTS
          </span>
        ) : null}
      </div>
      <div
        style={{
          fontFamily: serif,
          fontSize: 15,
          lineHeight: 1.3,
          color: "var(--ink)",
          marginTop: 9,
        }}
      >
        {activity.prompt}
      </div>
      <ActivityCardBody activity={activity} market={market} />
    </Tag>
  );
}

function ActivityCardBody({
  activity,
  market,
}: {
  activity: ActivityDraft;
  market?: AdminMarket;
}) {
  const options = activity.options?.filter((option) => option.trim()) ?? [];
  return (
    <>
      {(activity.mode === "Applied quiz" || activity.mode === "Poll") && options.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
          {options.slice(0, 4).map((option, index) => (
            <div
              key={index}
              style={{
                borderRadius: 10,
                border: "1px solid rgba(234,246,245,0.16)",
                padding: "7px 10px",
                fontSize: 9.5,
                color: "var(--ink-soft)",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ color: "var(--label)", fontSize: 8, lineHeight: "16px" }}>
                {String.fromCharCode(65 + index)}
              </span>
              <span
                style={{
                  fontFamily: serif,
                  fontSize: 11,
                  lineHeight: "16px",
                }}
              >
                {option}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {activity.mode === "Prediction" && market ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
          }}
        >
          <span
            style={{
              fontFamily: serif,
              fontSize: 18,
              color: "var(--champagne)",
            }}
          >
            {market.communityProbability > 0 ? `${market.communityProbability}%` : "—"}
          </span>
          <span style={{ fontSize: 8.5, color: "var(--muted)" }}>
            community probability · closes {market.closes}
          </span>
        </div>
      ) : null}
      <div
        style={{
          marginTop: 10,
          color: "var(--label)",
          fontSize: 8,
          fontWeight: 500,
          letterSpacing: 1.4,
        }}
      >
        {activity.mode === "Flashcard"
          ? "TAP TO REVEAL"
          : activity.mode === "Matching"
            ? `MATCH ${activity.matchingRows?.length ?? 0} PAIRS`
            : activity.mode === "Prediction"
              ? "MAKE YOUR CALL"
              : "START"}
      </div>
    </>
  );
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: "var(--label)",
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: 2,
      }}
    >
      {children}
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: serif,
        fontSize: 14.5,
        lineHeight: 1.65,
        color: "var(--muted)",
        margin: "10px 0",
      }}
    >
      {children}
    </div>
  );
}
