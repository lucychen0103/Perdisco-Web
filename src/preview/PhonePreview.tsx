import {
  ArrowLeft,
  Bookmark,
  BookmarkPlus,
  BookOpenText,
  ChevronRight,
  ExternalLink,
  Play,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import type {
  ActivityDraft,
  AdminMarket,
  AdminStatement,
  SourceProject,
  SummaryBlock,
} from "../types";
import { typeVisuals } from "../ui";

/**
 * Pixel-faithful recreation of the consumer app's summary and elaboration
 * screens (app/summary/[id].tsx and app/statement/[id].tsx) so editors
 * compose against the exact experience users receive.
 */

const serif = "var(--font-display)";

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 375,
        height: 720,
        borderRadius: 44,
        border: "10px solid var(--ink)",
        background: "var(--background)",
        overflow: "hidden",
        position: "relative",
        boxShadow: "var(--shadow)",
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
          background: "var(--ink)",
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
  return (
    <div>
      <div
        style={{
          height: 50,
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <PreviewCircle>
          <ArrowLeft size={16} color="var(--ink)" />
        </PreviewCircle>
        <span
          style={{
            color: "var(--forest)",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: 1.1,
          }}
        >
          INTERACTIVE SUMMARY
        </span>
        <PreviewCircle>
          <Bookmark size={16} color="var(--forest)" />
        </PreviewCircle>
      </div>

      <div style={{ padding: "0 15px 50px" }}>
        <div
          style={{
            borderRadius: 24,
            padding: 17,
            minHeight: 210,
            marginTop: 14,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            background: `linear-gradient(135deg, ${project.gradient[0]}, ${project.gradient[1]})`,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: 8,
              fontWeight: 900,
              letterSpacing: 1.2,
            }}
          >
            {project.format.toUpperCase()}S · {project.duration}
          </div>
          <div
            style={{
              color: "var(--white)",
              fontFamily: serif,
              fontSize: 24,
              lineHeight: "29px",
              fontWeight: 700,
              marginTop: 7,
            }}
          >
            {project.title || "Untitled source"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 12,
                background: "rgba(255,255,255,0.86)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--forest-dark)",
                fontSize: 9,
                fontWeight: 900,
              }}
            >
              {project.initials}
            </span>
            <div>
              <div style={{ color: "var(--white)", fontSize: 10.5, fontWeight: 900 }}>
                {project.creator}
              </div>
              <div style={{ color: "rgba(255,255,255,0.66)", fontSize: 8, marginTop: 1 }}>
                {project.creatorRole}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 11,
            marginTop: 11,
          }}
        >
          {(Object.keys(typeVisuals) as (keyof typeof typeVisuals)[]).map((type) => (
            <span
              key={type}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  background: typeVisuals[type].strong,
                }}
              />
              <span
                style={{ color: "var(--muted)", fontSize: 8.5, textTransform: "capitalize" }}
              >
                {type === "MENTAL MODEL" ? "Model" : type.toLowerCase()}
              </span>
            </span>
          ))}
        </div>

        <div style={{ paddingTop: 12 }}>
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
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    borderRadius: 19,
                    padding: 15,
                    margin: "9px 0",
                    minHeight: 116,
                    background: visual.background,
                    border: focused
                      ? `2px solid ${visual.strong}`
                      : "1px solid rgba(23,33,28,0.08)",
                    cursor: onSelect ? "pointer" : "default",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        color: visual.strong,
                        fontSize: 8,
                        fontWeight: 900,
                        letterSpacing: 1,
                      }}
                    >
                      {statement.type} · {statement.locator} ↗
                    </span>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        background: visual.strong,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <BookmarkPlus size={12} color="var(--white)" />
                    </span>
                  </div>
                  <div
                    style={{
                      color: "var(--ink)",
                      fontFamily: serif,
                      fontSize: 19,
                      lineHeight: "25px",
                      fontWeight: 700,
                    }}
                  >
                    {statement.text}
                  </div>
                </button>
              );
            }
            const activity = activityFor(block);
            if (!activity) return null;
            const focused = focusedId === block.id;
            return (
              <button
                key={block.id}
                onClick={() => onSelect?.(block.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 19,
                  padding: 14,
                  margin: "9px 0",
                  background: "var(--paper)",
                  border: focused ? "2px solid var(--forest)" : "1px solid var(--line)",
                  cursor: onSelect ? "pointer" : "default",
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
                      color: "var(--forest)",
                      fontSize: 8,
                      fontWeight: 900,
                      letterSpacing: 1,
                    }}
                  >
                    {activity.mode.toUpperCase()} · TRY IT
                  </span>
                  {activity.reward ? (
                    <span
                      style={{
                        background: "var(--token)",
                        color: "var(--forest-dark)",
                        borderRadius: 999,
                        padding: "2px 7px",
                        fontSize: 8,
                        fontWeight: 900,
                      }}
                    >
                      +{activity.reward}
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontFamily: serif,
                    fontSize: 15.5,
                    lineHeight: "21px",
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginTop: 8,
                  }}
                >
                  {activity.prompt}
                </div>
                <ActivityCardBody
                  activity={activity}
                  market={markets.find((market) => market.id === activity.marketId)}
                />
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 19,
            padding: 12,
            marginTop: 16,
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              background: "var(--lime)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} color="var(--forest-dark)" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 900 }}>
              Add this summary to your learning stack
            </div>
            <div style={{ fontSize: 8.5, color: "var(--muted)", marginTop: 2 }}>
              Preview {learningCount} eligible ideas before adding
            </div>
          </div>
          <ChevronRight size={16} color="var(--forest)" />
        </div>

        <div
          style={{
            marginTop: 14,
            padding: "10px 4px 0",
            borderTop: "1px solid var(--line)",
            color: "var(--subtle)",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 0.8,
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
}: {
  project: SourceProject;
  statement: AdminStatement;
}) {
  const visual = typeVisuals[statement.type];
  return (
    <div>
      <div
        style={{
          minHeight: 52,
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "0 13px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          className="pill"
          style={{ background: visual.strong, color: "var(--white)" }}
        >
          {statement.type}
        </span>
        <span
          style={{
            flex: 1,
            height: 32,
            borderRadius: 12,
            background: "var(--paper)",
            border: "1px solid var(--line)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            color: "var(--forest)",
            fontSize: 9.5,
            fontWeight: 900,
          }}
        >
          <BookOpenText size={13} />
          View full summary
        </span>
        <PreviewCircle>
          <X size={15} color="var(--ink)" />
        </PreviewCircle>
      </div>

      <div style={{ padding: "16px 15px 40px" }}>
        <div
          style={{
            fontFamily: serif,
            fontSize: 24,
            lineHeight: "31px",
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          {statement.text}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 15 }}>
          <div
            style={{
              flex: 1,
              minHeight: 56,
              borderRadius: 16,
              padding: 10,
              background: "var(--forest)",
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: "var(--lime)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Plus size={14} color="var(--forest-dark)" />
            </span>
            <div>
              <div style={{ color: "var(--white)", fontSize: 10, fontWeight: 900 }}>
                Add to learning stack
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, marginTop: 2 }}>
                Deliberately return to this idea later
              </div>
            </div>
          </div>
          <div
            style={{
              width: 50,
              borderRadius: 16,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bookmark size={17} color={visual.strong} />
          </div>
        </div>

        <PreviewSectionLabel>WHY THIS MATTERS</PreviewSectionLabel>
        <div
          style={{
            fontFamily: serif,
            fontSize: 16,
            lineHeight: "25px",
            color: "var(--ink)",
          }}
        >
          {statement.context || "No elaboration yet — this statement cannot publish as tappable."}
        </div>

        <div
          style={{
            marginTop: 15,
            borderRadius: 17,
            border: "1px solid var(--line)",
            background: "var(--paper)",
            padding: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              background: "var(--forest)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Play size={14} color="var(--white)" fill="var(--white)" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 900 }}>
              {project.medium === "audio"
                ? `Listen from ${statement.locator}`
                : project.medium === "video"
                  ? `Watch from ${statement.locator}`
                  : `Open at ${statement.locator}`}
            </div>
            <div style={{ fontSize: 8.5, color: "var(--muted)", marginTop: 2 }}>
              “{statement.sourceMoment}”
            </div>
          </div>
        </div>

        <PreviewSectionLabel>SOURCE & EVIDENCE</PreviewSectionLabel>
        <PreviewSourceLink
          index="01"
          role="PRIMARY SOURCE"
          title={project.title}
          meta={`${project.publisher} · ${statement.locator}`}
          tint={visual.background}
          tintStrong={visual.strong}
        />
        <PreviewSourceLink
          index="02"
          role="SUPPORTING SOURCE"
          title={statement.supportingSource}
          meta="Editor verified"
          tint="var(--paper-muted)"
          tintStrong="var(--forest)"
        />

        <div
          style={{
            borderRadius: 20,
            padding: 15,
            marginTop: 17,
            background: visual.background,
          }}
        >
          <div
            style={{
              color: visual.strong,
              fontSize: 8,
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            QUICK POLL · OPTIONAL
          </div>
          <div
            style={{
              fontFamily: serif,
              fontSize: 17,
              lineHeight: "23px",
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            Does this change how you would evaluate the next claim you encounter?
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
            {["Yes", "Not yet"].map((label) => (
              <span
                key={label}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.72)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10.5,
                  fontWeight: 900,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
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
                border: "1px solid var(--line)",
                background: "var(--paper-muted)",
                padding: "7px 10px",
                fontSize: 9.5,
                fontWeight: 700,
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {option}
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
              fontWeight: 700,
              color: "var(--forest)",
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
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginTop: 9,
          color: "var(--forest)",
          fontSize: 9,
          fontWeight: 900,
        }}
      >
        {activity.mode === "Flashcard"
          ? "Tap to reveal"
          : activity.mode === "Matching"
            ? `Match ${activity.matchingRows?.length ?? 0} pairs`
            : activity.mode === "Prediction"
              ? "Make your call"
              : "Start"}{" "}
        <ChevronRight size={11} />
      </div>
    </>
  );
}

function PreviewCircle({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        background: "var(--paper)",
        border: "1px solid var(--line)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: serif,
        fontSize: 15.5,
        lineHeight: "25px",
        color: "var(--ink)",
        margin: "8px 0",
      }}
    >
      {children}
    </div>
  );
}

function PreviewSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        marginTop: 24,
        marginBottom: 10,
      }}
    >
      <span
        style={{
          color: "var(--forest)",
          fontSize: 8,
          fontWeight: 900,
          letterSpacing: 1.2,
        }}
      >
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  );
}

function PreviewSourceLink({
  index,
  role,
  title,
  meta,
  tint,
  tintStrong,
}: {
  index: string;
  role: string;
  title: string;
  meta: string;
  tint: string;
  tintStrong: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--paper)",
        border: "1px solid var(--line)",
        borderRadius: 15,
        padding: 11,
        marginBottom: 7,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          background: tint,
          color: tintStrong,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          fontWeight: 900,
          flexShrink: 0,
        }}
      >
        {index}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "var(--forest)",
            fontSize: 7,
            fontWeight: 900,
            letterSpacing: 0.7,
          }}
        >
          {role}
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 8, color: "var(--muted)", marginTop: 2 }}>{meta}</div>
      </div>
      <ExternalLink size={14} color="var(--forest)" />
    </div>
  );
}
