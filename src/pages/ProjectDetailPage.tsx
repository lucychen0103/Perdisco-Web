import {
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CircleAlert,
  Plus,
  Puzzle,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import aiInstructions from "../../docs/ai-import-instructions.md?raw";
import { aiSuggestions } from "../data";
import {
  FORMAT_GUIDE,
  SAMPLE_MARKDOWN,
  parseMarkdown,
  type ParsedDocument,
} from "../lib/importMarkdown";
import { ElaborationPreview, PhoneFrame, SummaryPreview } from "../preview/PhonePreview";
import { useApp } from "../state";
import type {
  ActivityDraft,
  ActivityMode,
  AdminStatement,
  SourceProject,
  StatementType,
  SummaryBlock,
} from "../types";
import {
  Card,
  EmptyState,
  Eyebrow,
  FieldLabel,
  Modal,
  PrimaryButton,
  Row,
  SectionTitle,
  StatusPill,
  TypeBadge,
  inputStyle,
  textareaStyle,
  typeVisuals,
} from "../ui";

const TABS = ["Composer", "Intake & rights", "Processing", "Review gates", "Activities"] as const;
const STATEMENT_TYPES: StatementType[] = ["FACT", "OPINION", "FORECAST", "MENTAL MODEL"];
const ACTIVITY_MODES: ActivityMode[] = [
  "Flashcard",
  "Applied quiz",
  "Matching",
  "Poll",
  "Prediction",
];

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 100)}`;

export function ProjectDetailPage({ id }: { id: string }) {
  const {
    route,
    navigate,
    projectById,
    statementsFor,
    activitiesFor,
    statements: allStatements,
    activities: allActivities,
    updateStatement,
    addStatement,
    updateActivity,
    addActivity,
    insertBlock,
    updateTextBlock,
    moveBlock,
    removeBlock,
    updateProject,
    setGate,
    findings,
    markets,
    setFindingState,
    notify,
    addRelease,
    importDocument,
  } = useApp();

  const project = projectById(id);
  const statements = statementsFor(id);
  const activities = activitiesFor(id);

  const routeStatementId = route.split("/")[3];
  const routeBlockId = project?.blocks.find(
    (block) => block.kind === "statement" && block.statementId === routeStatementId,
  )?.id;

  const [tab, setTab] = useState<(typeof TABS)[number]>("Composer");
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>(routeBlockId);
  const [editingBlockId, setEditingBlockId] = useState<string | undefined>();
  const [addAfterId, setAddAfterId] = useState<string | "end" | undefined>();
  const [previewMode, setPreviewMode] = useState<"summary" | "elaboration">(
    routeBlockId ? "elaboration" : "summary",
  );
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  const projectFindings = findings.filter((finding) => finding.projectId === id);
  const suggestions = aiSuggestions.filter(
    (suggestion) => suggestion.projectId === id && !dismissed.includes(suggestion.id),
  );

  const publishBlockers = useMemo(() => {
    if (!project) return [];
    const reasons: string[] = [];
    project.gates.forEach((gate) => {
      if (gate.status !== "Approved") {
        reasons.push(`${gate.name} gate is ${gate.status.toLowerCase()}`);
      }
    });
    project.blockers.forEach((blocker) => reasons.push(`${blocker.object}: ${blocker.reason}`));
    if (project.rights.status !== "Cleared") {
      reasons.push(`Rights record is ${project.rights.status.toLowerCase()}`);
    }
    statements.forEach((statement) => {
      if (statement.elaborationState === "Empty") {
        reasons.push(`Statement “${statement.text.slice(0, 40)}…” has no elaboration`);
      }
    });
    return reasons;
  }, [project, statements]);

  if (!project) {
    return (
      <EmptyState
        title="Project unavailable"
        detail="This project may have been archived or you lack permission."
      />
    );
  }

  const selectedBlock = project.blocks.find((block) => block.id === selectedBlockId);
  const editingBlock = project.blocks.find((block) => block.id === editingBlockId);
  const selectedStatement =
    selectedBlock?.kind === "statement"
      ? allStatements.find((statement) => statement.id === selectedBlock.statementId)
      : undefined;

  const statementOrder = project.blocks
    .filter((block) => block.kind === "statement")
    .map((block) => block.id);

  const openBlock = (blockId: string) => {
    setSelectedBlockId(blockId);
    setEditingBlockId(blockId);
    const block = project.blocks.find((item) => item.id === blockId);
    if (block?.kind === "statement") setPreviewMode("elaboration");
    else setPreviewMode("summary");
  };

  const focusFromPreview = (blockId: string) => {
    setSelectedBlockId(blockId);
    const block = project.blocks.find((item) => item.id === blockId);
    setPreviewMode(block?.kind === "statement" ? "elaboration" : "summary");
  };

  const createBlock = (kind: SummaryBlock["kind"], afterId?: string) => {
    const after = afterId === "end" ? undefined : afterId;
    if (kind === "text") {
      const block: SummaryBlock = { kind: "text", id: uid("blk"), text: "" };
      insertBlock(project.id, block, after);
      openBlock(block.id);
      return;
    }
    if (kind === "statement") {
      const statementId = uid("s");
      const statement: AdminStatement = {
        id: statementId,
        projectId: project.id,
        type: "FACT",
        text: "New statement — paraphrase the idea in plain language.",
        context: "",
        locator: "0:00",
        sourceMoment: "",
        supportingSource: "",
        supportingUrl: "",
        topic: project.category,
        learningEligible: false,
        attribution: project.creator,
        anchor: `${project.id}/v${project.version}#${statementId}`,
        aiSuggested: false,
        elaborationState: "Empty",
        discussionEnabled: false,
      };
      addStatement(statement);
      const block: SummaryBlock = { kind: "statement", id: uid("blk"), statementId };
      insertBlock(project.id, block, after);
      openBlock(block.id);
      return;
    }
    const activityId = uid("act");
    const activity: ActivityDraft = {
      id: activityId,
      projectId: project.id,
      statementId: statements[0]?.id ?? "",
      mode: "Flashcard",
      prompt: "",
      status: "Draft",
      aiSuggested: false,
    };
    addActivity(activity);
    const block: SummaryBlock = { kind: "activity", id: uid("blk"), activityId };
    insertBlock(project.id, block, after);
    openBlock(block.id);
  };

  const acceptSuggestion = (suggestionId: string) => {
    const suggestion = suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) return;
    const statementId = uid("s");
    addStatement({
      id: statementId,
      projectId: project.id,
      type: suggestion.type,
      text: suggestion.text,
      context: "",
      locator: suggestion.locator,
      sourceMoment: "",
      supportingSource: "",
      supportingUrl: "",
      topic: project.category,
      learningEligible: false,
      attribution: project.creator,
      anchor: `${project.id}/v${project.version}#${statementId}`,
      aiSuggested: true,
      aiModelRun: suggestion.modelRun,
      elaborationState: "Empty",
      discussionEnabled: false,
    });
    const block: SummaryBlock = { kind: "statement", id: uid("blk"), statementId };
    insertBlock(project.id, block);
    setDismissed((prev) => [...prev, suggestionId]);
    openBlock(block.id);
    notify("Suggestion accepted as editable draft — attributed to Lucy Chen");
  };

  const publish = () => {
    if (publishBlockers.length > 0) {
      notify(`Publication blocked — ${publishBlockers.length} unresolved requirement(s)`);
      return;
    }
    addRelease({
      id: uid("r"),
      projectId: project.id,
      version: project.version,
      state: "Scheduled",
      when: "Next window · Aug 1, 09:00",
      publisher: "Lucy Chen",
      cohort: "All users",
      health: "—",
    });
    updateProject(project.id, { state: "Scheduled" });
    notify(`Immutable v${project.version} scheduled — audit event recorded`);
  };

  return (
    <div>
      <button
        onClick={() => navigate("projects")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          color: "var(--forest)",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        <ArrowLeft size={15} /> All projects
      </button>

      <Row gap={16} align="flex-start" style={{ justifyContent: "space-between" }}>
        <div style={{ minWidth: 0 }}>
          <Eyebrow>
            {project.format} · {project.category} · {project.organization} /{" "}
            {project.workspace}
          </Eyebrow>
          <h1 className="display" style={{ fontSize: 30, lineHeight: "36px", marginTop: 4 }}>
            {project.title}
          </h1>
          <Row gap={8} wrap style={{ marginTop: 8 }}>
            <StatusPill value={project.state} />
            <StatusPill value={project.rights.status} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              v{project.version} draft · owner {project.owner} · contributors{" "}
              {project.contributors.join(", ") || "none"} · target {project.targetRelease}
            </span>
          </Row>
        </div>
        <Row gap={8} style={{ flexShrink: 0 }}>
          <PrimaryButton
            label="Request review"
            variant="light"
            onClick={() => {
              updateProject(project.id, { state: "In review" });
              notify("Preflight passed — review gates opened");
            }}
          />
          <PrimaryButton
            label={
              publishBlockers.length
                ? `Publish (${publishBlockers.length} blockers)`
                : "Publish version"
            }
            onClick={publish}
          />
        </Row>
      </Row>

      {project.blockers.length > 0 ? (
        <Card style={{ marginTop: 16, borderColor: "var(--danger)", padding: 14 }}>
          <Row gap={9}>
            <CircleAlert size={16} color="var(--danger)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)" }}>
              Blocked — every blocking condition names its owner and resolution
            </span>
          </Row>
          {project.blockers.map((blocker) => (
            <div
              key={blocker.object}
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--line)",
                fontSize: 12,
              }}
            >
              <b>{blocker.object}</b> — {blocker.reason}
              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 3 }}>
                Responsible: {blocker.responsibleRole} · Resolution: {blocker.resolution} ·{" "}
                {blocker.overridable
                  ? "Override available with elevated permission + reason"
                  : "No override — hard requirement"}
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      <Row
        gap={6}
        wrap
        style={{ marginTop: 20, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}
      >
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

      {tab === "Composer" ? (
        <div style={{ display: "flex", gap: 24, marginTop: 20, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Card style={{ marginBottom: 16 }}>
              <FieldLabel>
                Editorial orientation — shown before the summary document
              </FieldLabel>
              <textarea
                value={project.orientation}
                onChange={(event) =>
                  updateProject(project.id, { orientation: event.target.value })
                }
                rows={2}
                style={textareaStyle}
                placeholder="What the source covers, why it matters, scope or limitations"
              />
            </Card>

            <Row style={{ justifyContent: "space-between", marginBottom: 10 }} gap={12}>
              <div>
                <Eyebrow style={{ fontSize: 9 }}>Summary document</Eyebrow>
                <div className="display" style={{ fontSize: 20 }}>
                  {project.blocks.length} blocks · {statements.length} statements ·{" "}
                  {project.blocks.filter((block) => block.kind === "activity").length}{" "}
                  activities
                </div>
              </div>
              <PrimaryButton
                small
                variant="light"
                icon={<Upload size={13} />}
                label="Import markdown"
                onClick={() => setImportOpen(true)}
              />
            </Row>

            {project.blocks.length === 0 ? (
              <EmptyState
                title="Empty document"
                detail="Add summary text, statements, and activities below — stack and reorder them like a document."
              />
            ) : (
              project.blocks.map((block, index) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  index={index}
                  count={project.blocks.length}
                  statementNumber={
                    block.kind === "statement"
                      ? statementOrder.indexOf(block.id) + 1
                      : undefined
                  }
                  statement={
                    block.kind === "statement"
                      ? allStatements.find((item) => item.id === block.statementId)
                      : undefined
                  }
                  activity={
                    block.kind === "activity"
                      ? allActivities.find((item) => item.id === block.activityId)
                      : undefined
                  }
                  selected={selectedBlockId === block.id}
                  onOpen={() => openBlock(block.id)}
                  onMove={(direction) => moveBlock(project.id, block.id, direction)}
                  onInsertBelow={() => setAddAfterId(block.id)}
                />
              ))
            )}

            <Card
              style={{
                marginTop: 12,
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                background: "var(--paper-muted)",
                border: "1px dashed var(--line)",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginRight: 4 }}>
                Add to end of document:
              </span>
              <PrimaryButton
                small
                variant="light"
                icon={<AlignLeft size={13} />}
                label="Summary text"
                onClick={() => createBlock("text")}
              />
              <PrimaryButton
                small
                variant="light"
                icon={<Plus size={13} />}
                label="Statement"
                onClick={() => createBlock("statement")}
              />
              <PrimaryButton
                small
                variant="light"
                icon={<Puzzle size={13} />}
                label="Activity"
                onClick={() => createBlock("activity")}
              />
            </Card>

            {suggestions.length > 0 ? (
              <>
                <SectionTitle
                  eyebrow="AI assistance · labeled, reviewable, attributable"
                  title="Suggested statements"
                />
                {suggestions.map((suggestion) => (
                  <Card key={suggestion.id} style={{ marginBottom: 10 }}>
                    <Row gap={8} wrap>
                      <TypeBadge type={suggestion.type} />
                      <span
                        className="pill"
                        style={{ background: "var(--paper-muted)", color: "var(--muted)" }}
                      >
                        <Sparkles size={10} /> AI suggestion · {suggestion.modelRun}
                      </span>
                      <span
                        className="pill"
                        style={{ background: "var(--blue)", color: "var(--blue-dark)" }}
                      >
                        Confidence {suggestion.confidence}
                      </span>
                    </Row>
                    <div
                      className="display"
                      style={{ fontSize: 17, lineHeight: "23px", marginTop: 9 }}
                    >
                      {suggestion.text}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                      Source region {suggestion.locator} · {suggestion.note}
                    </div>
                    <Row gap={8} style={{ marginTop: 11 }}>
                      <PrimaryButton
                        small
                        label="Accept as draft"
                        onClick={() => acceptSuggestion(suggestion.id)}
                      />
                      <PrimaryButton
                        small
                        variant="light"
                        label="Reject"
                        onClick={() => {
                          setDismissed((prev) => [...prev, suggestion.id]);
                          notify("Suggestion rejected — recorded for model quality review");
                        }}
                      />
                    </Row>
                  </Card>
                ))}
              </>
            ) : null}
          </div>

          <div style={{ position: "sticky", top: 86, flexShrink: 0 }}>
            <Row gap={6} style={{ marginBottom: 10, justifyContent: "center" }}>
              {(["summary", "elaboration"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPreviewMode(mode)}
                  disabled={mode === "elaboration" && !selectedStatement}
                  className="pill"
                  style={{
                    padding: "8px 14px",
                    fontSize: 10,
                    background: previewMode === mode ? "var(--forest)" : "var(--paper)",
                    color: previewMode === mode ? "var(--white)" : "var(--muted)",
                    border: "1px solid var(--line)",
                    opacity: mode === "elaboration" && !selectedStatement ? 0.45 : 1,
                  }}
                >
                  {mode === "summary" ? "Summary preview" : "Elaboration preview"}
                </button>
              ))}
            </Row>
            <PhoneFrame>
              {previewMode === "elaboration" && selectedStatement ? (
                <ElaborationPreview project={project} statement={selectedStatement} />
              ) : (
                <SummaryPreview
                  project={project}
                  statements={statements}
                  activities={activities}
                  markets={markets}
                  focusedId={selectedBlockId}
                  onSelect={focusFromPreview}
                />
              )}
            </PhoneFrame>
            <div
              style={{
                textAlign: "center",
                fontSize: 10,
                color: "var(--subtle)",
                marginTop: 9,
                maxWidth: 375,
              }}
            >
              Rendered from the same versioned content contract as the mobile app ·
              iPhone 15 viewport
            </div>
          </div>
        </div>
      ) : null}

      {tab === "Intake & rights" ? (
        <div
          style={{ display: "flex", gap: 18, marginTop: 20, flexWrap: "wrap", maxWidth: 1000 }}
        >
          <Card style={{ flex: 1, minWidth: 340 }}>
            <Eyebrow style={{ fontSize: 9, marginBottom: 10 }}>Source identity</Eyebrow>
            <KeyValue label="Title" value={project.title} />
            <KeyValue label="Creator" value={`${project.creator} — ${project.creatorRole}`} />
            <KeyValue label="Publication" value={project.publisher} />
            <KeyValue label="Canonical URL" value={project.canonicalUrl} />
            <KeyValue label="Published" value={project.published} />
            <KeyValue label="Language" value={project.language} />
            <KeyValue label="Duration" value={project.duration} />
            <Eyebrow style={{ fontSize: 9, margin: "16px 0 10px" }}>Playback contract</Eyebrow>
            <KeyValue label="Primary source" value={project.playback.primary} />
            {project.playback.fallback ? (
              <KeyValue label="Fallback" value={project.playback.fallback} />
            ) : null}
            <KeyValue label="Transcript" value={project.playback.transcriptSource} />
            <Row gap={8} style={{ marginTop: 8 }}>
              <StatusPill value={project.playback.transcriptState} />
              {project.format === "Podcast" ? (
                <span style={{ fontSize: 10, color: "var(--muted)" }}>
                  Timestamp deep links must seek within a 3-second tolerance
                </span>
              ) : null}
            </Row>
          </Card>
          <Card style={{ flex: 1, minWidth: 340 }}>
            <Row style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <Eyebrow style={{ fontSize: 9 }}>Rights record</Eyebrow>
              <StatusPill value={project.rights.status} />
            </Row>
            <KeyValue label="Owner" value={project.rights.owner} />
            <KeyValue label="Basis" value={project.rights.basis} />
            <KeyValue label="Approved uses" value={project.rights.approvedUses.join(" · ")} />
            <KeyValue label="Restrictions" value={project.rights.restrictions} />
            <KeyValue label="Media behavior" value={project.rights.mediaBehavior} />
            <KeyValue label="Expiry" value={project.rights.expiry} />
            <KeyValue label="Takedown contact" value={project.rights.takedownContact} />
            <KeyValue label="Reviewed by" value={project.rights.reviewer} />
            <div
              style={{
                marginTop: 12,
                padding: 11,
                borderRadius: 12,
                background: "var(--paper-muted)",
                fontSize: 10.5,
                color: "var(--muted)",
                lineHeight: 1.5,
              }}
            >
              Consumer playback behavior is determined by this record — not by the presence
              of a URL or timestamp. Publication is blocked if the record is missing, expired,
              or incompatible with the intended behavior.
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "Processing" ? (
        <div style={{ marginTop: 20, maxWidth: 760 }}>
          {project.processing.map((step) => (
            <Card
              key={step.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: 13,
                marginBottom: 8,
              }}
            >
              <StatusPill value={step.status} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{step.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {step.detail}
                </div>
              </div>
              {step.status === "Failed" ? (
                <PrimaryButton
                  small
                  variant="light"
                  label="Retry"
                  onClick={() => notify("Processing retried — job queued")}
                />
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "Review gates" ? (
        <div style={{ display: "flex", gap: 20, marginTop: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 360 }}>
            {project.gates.map((gate) => (
              <Card
                key={gate.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 13,
                  marginBottom: 8,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{gate.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
                    {gate.reviewer ? `Reviewer: ${gate.reviewer}` : "Unassigned"}
                    {gate.note ? ` · ${gate.note}` : ""}
                  </div>
                </div>
                <StatusPill value={gate.status} />
                {gate.status !== "Approved" ? (
                  <PrimaryButton
                    small
                    variant="light"
                    label="Approve"
                    onClick={() => {
                      setGate(project.id, gate.name, "Approved", "Lucy Chen");
                      notify(`${gate.name} approved — recorded under Reviewer role`);
                    }}
                  />
                ) : null}
              </Card>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 360 }}>
            <Eyebrow style={{ fontSize: 9, marginBottom: 10 }}>
              Findings · attached to exact fields
            </Eyebrow>
            {projectFindings.length === 0 ? (
              <EmptyState
                title="No findings"
                detail="Reviewers attach findings to statements, activities, and assets."
              />
            ) : (
              projectFindings.map((finding) => (
                <Card key={finding.id} style={{ padding: 13, marginBottom: 8 }}>
                  <Row gap={8} wrap>
                    <StatusPill value={finding.severity} />
                    <span className="eyebrow" style={{ fontSize: 8.5, color: "var(--muted)" }}>
                      {finding.gate} · {finding.target}
                    </span>
                    <span style={{ marginLeft: "auto" }}>
                      <StatusPill value={finding.state} />
                    </span>
                  </Row>
                  <div style={{ fontSize: 12.5, marginTop: 8, lineHeight: 1.5 }}>
                    {finding.note}
                  </div>
                  <Row gap={8} style={{ marginTop: 9, justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: "var(--subtle)" }}>
                      {finding.author} · {finding.createdAt}
                    </span>
                    {finding.state === "Open" ? (
                      <PrimaryButton
                        small
                        variant="light"
                        label="Mark resolved"
                        onClick={() => {
                          setFindingState(finding.id, "Resolved");
                          notify("Finding resolved — reviewer will re-verify");
                        }}
                      />
                    ) : null}
                  </Row>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : null}

      {tab === "Activities" ? (
        <div style={{ marginTop: 20, maxWidth: 760 }}>
          {activities.length === 0 ? (
            <EmptyState
              title="No learning activities"
              detail="Add activity blocks in the composer — every activity links to a statement and requires human approval of the answer key."
            />
          ) : (
            activities.map((activity) => (
              <Card
                key={activity.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  padding: 13,
                  marginBottom: 8,
                }}
              >
                <span
                  className="pill"
                  style={{ background: "var(--forest)", color: "var(--white)" }}
                >
                  {activity.mode}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                    {activity.prompt || "Untitled activity"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
                    Linked statement {activity.statementId || "—"}
                    {activity.aiSuggested
                      ? " · AI-drafted, needs human answer-key approval"
                      : ""}
                  </div>
                </div>
                <StatusPill value={activity.status} />
              </Card>
            ))
          )}
        </div>
      ) : null}

      {importOpen ? (
        <ImportMarkdownModal
          project={project}
          onClose={() => setImportOpen(false)}
          onApply={(parsed, mode) => {
            importDocument(
              project.id,
              {
                blocks: parsed.blocks,
                statements: parsed.statements,
                activities: parsed.activities,
                orientation: parsed.orientation,
              },
              mode,
            );
            setSelectedBlockId(undefined);
            setImportOpen(false);
            notify(
              `${mode === "replace" ? "Replaced" : "Appended"} — ${parsed.counts.text} text, ${parsed.counts.statements} statements, ${parsed.counts.activities} activities imported as drafts`,
            );
          }}
        />
      ) : null}

      {addAfterId !== undefined ? (
        <Modal
          eyebrow="Insert block"
          title="What do you want to add?"
          width={440}
          onClose={() => setAddAfterId(undefined)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AddChoice
              icon={<AlignLeft size={17} color="var(--forest)" />}
              title="Summary text"
              detail="Editorial prose that connects and frames the surrounding blocks."
              onClick={() => {
                createBlock("text", addAfterId);
                setAddAfterId(undefined);
              }}
            />
            <AddChoice
              icon={<Plus size={17} color="var(--forest)" />}
              title="Statement"
              detail="A large-type fact, opinion, forecast, or mental model with its elaboration."
              onClick={() => {
                createBlock("statement", addAfterId);
                setAddAfterId(undefined);
              }}
            />
            <AddChoice
              icon={<Puzzle size={17} color="var(--forest)" />}
              title="Activity"
              detail="An inline flashcard, quiz, matching task, poll, or prediction."
              onClick={() => {
                createBlock("activity", addAfterId);
                setAddAfterId(undefined);
              }}
            />
          </div>
        </Modal>
      ) : null}

      {editingBlock?.kind === "text" ? (
        <TextBlockModal
          text={editingBlock.text}
          onChange={(text) => updateTextBlock(project.id, editingBlock.id, text)}
          onRemove={() => {
            removeBlock(project.id, editingBlock.id);
            setEditingBlockId(undefined);
            setSelectedBlockId(undefined);
            notify("Summary text removed from draft");
          }}
          onClose={() => setEditingBlockId(undefined)}
        />
      ) : null}

      {editingBlock?.kind === "statement" ? (
        <StatementModal
          statement={allStatements.find((item) => item.id === editingBlock.statementId)}
          onChange={(patch) => updateStatement(editingBlock.statementId, patch)}
          onRemove={() => {
            removeBlock(project.id, editingBlock.id);
            setEditingBlockId(undefined);
            setSelectedBlockId(undefined);
            notify("Statement removed from draft — audit event recorded");
          }}
          onClose={() => setEditingBlockId(undefined)}
        />
      ) : null}

      {editingBlock?.kind === "activity" ? (
        <ActivityModal
          activity={allActivities.find((item) => item.id === editingBlock.activityId)}
          statements={statements}
          onChange={(patch) => updateActivity(editingBlock.activityId, patch)}
          onRemove={() => {
            removeBlock(project.id, editingBlock.id);
            setEditingBlockId(undefined);
            setSelectedBlockId(undefined);
            notify("Activity removed from draft");
          }}
          onClose={() => setEditingBlockId(undefined)}
        />
      ) : null}
    </div>
  );
}

function AddChoice({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        padding: 13,
        borderRadius: 14,
        background: "var(--paper-muted)",
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: "var(--paper)",
          border: "1px solid var(--line)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{title}</span>
        <span
          style={{ display: "block", fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}
        >
          {detail}
        </span>
      </span>
    </button>
  );
}

function BlockRow({
  block,
  index,
  count,
  statementNumber,
  statement,
  activity,
  selected,
  onOpen,
  onMove,
  onInsertBelow,
}: {
  block: SummaryBlock;
  index: number;
  count: number;
  statementNumber?: number;
  statement?: AdminStatement;
  activity?: ActivityDraft;
  selected: boolean;
  onOpen: () => void;
  onMove: (direction: -1 | 1) => void;
  onInsertBelow: () => void;
}) {
  const accent =
    block.kind === "statement" && statement ? typeVisuals[statement.type] : undefined;
  return (
    <Card
      style={{
        marginBottom: 8,
        padding: 0,
        border: selected
          ? `2px solid ${accent ? accent.strong : "var(--forest)"}`
          : "1px solid var(--line)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div
          onClick={onOpen}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 13,
            cursor: "pointer",
          }}
        >
          {block.kind === "text" ? (
            <>
              <BlockIcon>
                <AlignLeft size={14} color="var(--muted)" />
              </BlockIcon>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Eyebrow style={{ fontSize: 8, color: "var(--subtle)" }}>Summary text</Eyebrow>
                <div
                  className="display"
                  style={{
                    fontSize: 14,
                    lineHeight: "20px",
                    fontWeight: 400,
                    marginTop: 3,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    color: block.text ? "var(--ink)" : "var(--subtle)",
                  }}
                >
                  {block.text || "Empty text block — click to write"}
                </div>
              </div>
            </>
          ) : null}

          {block.kind === "statement" ? (
            statement ? (
              <>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 9,
                    background: accent?.background,
                    color: accent?.strong,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {statementNumber}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="display"
                    style={{
                      fontSize: 15,
                      lineHeight: "20px",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {statement.text}
                  </div>
                  <Row gap={6} wrap style={{ marginTop: 5 }}>
                    <TypeBadge type={statement.type} />
                    <span
                      className="pill"
                      style={{ background: "var(--paper-muted)", color: "var(--muted)" }}
                    >
                      {statement.locator}
                    </span>
                    <StatusPill
                      value={
                        statement.elaborationState === "Complete"
                          ? "Complete"
                          : statement.elaborationState === "Draft"
                            ? "Needs review"
                            : "Missing"
                      }
                    />
                    {statement.aiSuggested ? (
                      <span
                        className="pill"
                        style={{ background: "var(--paper-muted)", color: "var(--muted)" }}
                      >
                        <Sparkles size={9} /> AI-origin
                      </span>
                    ) : null}
                  </Row>
                </div>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "var(--danger)" }}>
                Missing statement record
              </span>
            )
          ) : null}

          {block.kind === "activity" ? (
            activity ? (
              <>
                <BlockIcon tone="forest">
                  <Puzzle size={14} color="var(--white)" />
                </BlockIcon>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Eyebrow style={{ fontSize: 8, color: "var(--subtle)" }}>
                    Activity · {activity.mode}
                  </Eyebrow>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      marginTop: 3,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      color: activity.prompt ? "var(--ink)" : "var(--subtle)",
                    }}
                  >
                    {activity.prompt || "Empty activity — click to author"}
                  </div>
                </div>
                <StatusPill value={activity.status} />
              </>
            ) : (
              <span style={{ fontSize: 12, color: "var(--danger)" }}>
                Missing activity record
              </span>
            )
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 3,
            padding: "8px 10px 8px 0",
            flexShrink: 0,
          }}
        >
          <RowIconButton disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp size={12} style={{ opacity: index === 0 ? 0.3 : 1 }} />
          </RowIconButton>
          <RowIconButton disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown size={12} style={{ opacity: index === count - 1 ? 0.3 : 1 }} />
          </RowIconButton>
          <RowIconButton onClick={onInsertBelow} title="Insert block below">
            <Plus size={12} />
          </RowIconButton>
        </div>
      </div>
    </Card>
  );
}

function BlockIcon({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "forest";
}) {
  return (
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: 9,
        background: tone === "forest" ? "var(--forest)" : "var(--paper-muted)",
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

function RowIconButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      className="icon-button"
      title={title}
      disabled={disabled}
      style={{ width: 26, height: 26, borderRadius: 9 }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function ModalFooter({
  onRemove,
  onClose,
  removeLabel,
}: {
  onRemove: () => void;
  onClose: () => void;
  removeLabel: string;
}) {
  return (
    <Row style={{ marginTop: 16, justifyContent: "space-between" }}>
      <button
        onClick={onRemove}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--danger)",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        <Trash2 size={13} /> {removeLabel}
      </button>
      <PrimaryButton label="Done" onClick={onClose} />
    </Row>
  );
}

function TextBlockModal({
  text,
  onChange,
  onRemove,
  onClose,
}: {
  text: string;
  onChange: (text: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <Modal eyebrow="Summary text" title="Editorial prose" onClose={onClose}>
      <FieldLabel>
        Rendered as reading text between blocks — changes appear in the preview instantly
      </FieldLabel>
      <textarea
        autoFocus
        value={text}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        style={{
          ...textareaStyle,
          fontFamily: "var(--font-display)",
          fontSize: 16,
          lineHeight: 1.6,
        }}
        placeholder="Connect the surrounding statements: what just happened in the argument, and what comes next?"
      />
      <ModalFooter onRemove={onRemove} onClose={onClose} removeLabel="Remove block" />
    </Modal>
  );
}

function StatementModal({
  statement,
  onChange,
  onRemove,
  onClose,
}: {
  statement?: AdminStatement;
  onChange: (patch: Partial<AdminStatement>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  if (!statement) return null;
  return (
    <Modal eyebrow={`Statement · anchor ${statement.anchor}`} title="Statement & elaboration" width={640} onClose={onClose}>
      <FieldLabel>Statement text — large type in the consumer summary</FieldLabel>
      <textarea
        autoFocus
        value={statement.text}
        onChange={(event) => onChange({ text: event.target.value })}
        rows={2}
        style={{ ...textareaStyle, fontFamily: "var(--font-display)", fontSize: 16 }}
      />
      <Row gap={6} wrap style={{ marginTop: 10 }}>
        {STATEMENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onChange({ type })}
            className="pill"
            style={{
              padding: "8px 12px",
              fontSize: 9,
              background:
                statement.type === type
                  ? typeVisuals[type].strong
                  : typeVisuals[type].background,
              color: statement.type === type ? "var(--white)" : typeVisuals[type].strong,
            }}
          >
            {type}
          </button>
        ))}
      </Row>
      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 130 }}>
          <FieldLabel>Source location</FieldLabel>
          <input
            value={statement.locator}
            onChange={(event) => onChange({ locator: event.target.value })}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 2, minWidth: 180 }}>
          <FieldLabel>Attribution</FieldLabel>
          <input
            value={statement.attribution}
            onChange={(event) => onChange({ attribution: event.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid var(--line)",
        }}
      >
        <Eyebrow style={{ fontSize: 9, marginBottom: 8 }}>Elaboration layer</Eyebrow>
        <FieldLabel>Why this matters — plain-language context</FieldLabel>
        <textarea
          value={statement.context}
          onChange={(event) =>
            onChange({
              context: event.target.value,
              elaborationState: event.target.value.trim()
                ? statement.elaborationState === "Empty"
                  ? "Draft"
                  : statement.elaborationState
                : "Empty",
            })
          }
          rows={3}
          style={textareaStyle}
          placeholder="Context, implications, qualifications, uncertainty"
        />
        <div style={{ marginTop: 10 }}>
          <FieldLabel>Source moment — quoted for internal verification only</FieldLabel>
          <input
            value={statement.sourceMoment}
            onChange={(event) => onChange({ sourceMoment: event.target.value })}
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <FieldLabel>Supporting source</FieldLabel>
            <input
              value={statement.supportingSource}
              onChange={(event) => onChange({ supportingSource: event.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <FieldLabel>Supporting URL</FieldLabel>
            <input
              value={statement.supportingUrl}
              onChange={(event) => onChange({ supportingUrl: event.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
        <Row gap={14} wrap style={{ marginTop: 13 }}>
          <Toggle
            label="Learning eligible"
            checked={statement.learningEligible}
            onChange={(checked) => onChange({ learningEligible: checked })}
          />
          <Toggle
            label="Statement discussion"
            checked={statement.discussionEnabled}
            onChange={(checked) => onChange({ discussionEnabled: checked })}
          />
          <Toggle
            label="Elaboration complete"
            checked={statement.elaborationState === "Complete"}
            onChange={(checked) =>
              onChange({ elaborationState: checked ? "Complete" : "Draft" })
            }
          />
        </Row>
      </div>
      <ModalFooter onRemove={onRemove} onClose={onClose} removeLabel="Remove statement" />
    </Modal>
  );
}

const MODE_HINTS: Record<ActivityMode, string> = {
  Flashcard: "Prompt, expected concept, and a reveal explanation with source link.",
  "Applied quiz": "Options with one defensible answer and explanatory feedback.",
  Matching: "Concept-to-example pairs with a non-drag accessibility alternative.",
  Poll: "Non-scored perspective prompt with transparent result presentation.",
  Prediction: "Objectively resolvable question operated under separate market controls.",
};

function ActivityModal({
  activity,
  statements,
  onChange,
  onRemove,
  onClose,
}: {
  activity?: ActivityDraft;
  statements: AdminStatement[];
  onChange: (patch: Partial<ActivityDraft>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { markets } = useApp();
  if (!activity) return null;

  const switchMode = (mode: ActivityMode) => {
    const patch: Partial<ActivityDraft> = { mode };
    if ((mode === "Applied quiz" || mode === "Poll") && !activity.options?.length) {
      patch.options = ["", ""];
    }
    if (mode === "Applied quiz" && activity.correctIndex === undefined) {
      patch.correctIndex = 0;
    }
    if (mode === "Matching" && !activity.matchingRows?.length) {
      patch.matchingRows = [
        { left: "", right: "" },
        { left: "", right: "" },
      ];
    }
    onChange(patch);
  };

  const linkedMarket = markets.find((market) => market.id === activity.marketId);
  const projectMarkets = markets.filter((market) => market.projectId === activity.projectId);

  return (
    <Modal eyebrow="Inline learning activity" title="Activity" width={640} onClose={onClose}>
      <FieldLabel>Activity type</FieldLabel>
      <Row gap={6} wrap>
        {ACTIVITY_MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => switchMode(mode)}
            className="pill"
            style={{
              padding: "8px 13px",
              fontSize: 10,
              background: activity.mode === mode ? "var(--forest)" : "var(--paper-muted)",
              color: activity.mode === mode ? "var(--white)" : "var(--muted)",
            }}
          >
            {mode}
          </button>
        ))}
      </Row>
      <div style={{ fontSize: 10.5, color: "var(--subtle)", margin: "6px 0 12px" }}>
        {MODE_HINTS[activity.mode]}
      </div>

      <FieldLabel>Prompt</FieldLabel>
      <textarea
        autoFocus
        value={activity.prompt}
        onChange={(event) => onChange({ prompt: event.target.value })}
        rows={2}
        style={{ ...textareaStyle, fontFamily: "var(--font-display)", fontSize: 15 }}
        placeholder={
          activity.mode === "Prediction"
            ? "Clear, neutral, singular question connected to source context"
            : "Test recall, consequences, assumptions, or application — not copied wording"
        }
      />

      <div style={{ marginTop: 12 }}>
        <FieldLabel>Linked statement — required for publication</FieldLabel>
        <select
          value={activity.statementId}
          onChange={(event) => onChange({ statementId: event.target.value })}
          style={inputStyle}
        >
          <option value="">Not linked yet</option>
          {statements.map((statement) => (
            <option key={statement.id} value={statement.id}>
              {statement.text.slice(0, 60)}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--line)",
        }}
      >
        <Eyebrow style={{ fontSize: 9, marginBottom: 10 }}>
          {activity.mode} template
        </Eyebrow>

        {activity.mode === "Flashcard" ? (
          <>
            <FieldLabel>Expected concept — shown on reveal</FieldLabel>
            <input
              value={activity.answer ?? ""}
              onChange={(event) => onChange({ answer: event.target.value })}
              style={inputStyle}
              placeholder="The concept the learner should recall"
            />
            <div style={{ marginTop: 10 }}>
              <FieldLabel>Reveal explanation</FieldLabel>
              <textarea
                value={activity.explanation ?? ""}
                onChange={(event) => onChange({ explanation: event.target.value })}
                rows={2}
                style={textareaStyle}
                placeholder="Why this is the answer, linked back to the source"
              />
            </div>
            <RewardField activity={activity} onChange={onChange} />
          </>
        ) : null}

        {activity.mode === "Applied quiz" ? (
          <>
            <FieldLabel>Options — mark the defensible answer</FieldLabel>
            <OptionsEditor
              options={activity.options ?? ["", ""]}
              correctIndex={activity.correctIndex}
              onChange={(options, correctIndex) => onChange({ options, correctIndex })}
            />
            <div style={{ marginTop: 10 }}>
              <FieldLabel>Answer-key rationale — why the key is defensible</FieldLabel>
              <textarea
                value={activity.explanation ?? ""}
                onChange={(event) => onChange({ explanation: event.target.value })}
                rows={2}
                style={textareaStyle}
                placeholder="Explain why different contexts change the answer"
              />
            </div>
            <RewardField activity={activity} onChange={onChange} />
          </>
        ) : null}

        {activity.mode === "Matching" ? (
          <>
            <FieldLabel>Pairs — concept to example, constraint, or implication</FieldLabel>
            <PairsEditor
              rows={activity.matchingRows ?? []}
              onChange={(matchingRows) => onChange({ matchingRows })}
            />
            <div style={{ fontSize: 10, color: "var(--subtle)", marginTop: 6 }}>
              Consumers get a non-drag alternative automatically (tap-to-pair) for
              accessibility.
            </div>
            <div style={{ marginTop: 10 }}>
              <FieldLabel>Explanation shown after matching</FieldLabel>
              <textarea
                value={activity.explanation ?? ""}
                onChange={(event) => onChange({ explanation: event.target.value })}
                rows={2}
                style={textareaStyle}
              />
            </div>
            <RewardField activity={activity} onChange={onChange} />
          </>
        ) : null}

        {activity.mode === "Poll" ? (
          <>
            <FieldLabel>Choices — no correct answer</FieldLabel>
            <OptionsEditor
              options={activity.options ?? ["", ""]}
              onChange={(options) => onChange({ options })}
            />
            <div style={{ fontSize: 10, color: "var(--subtle)", marginTop: 6 }}>
              Polls are non-scored; results are presented transparently after answering.
            </div>
            <RewardField activity={activity} onChange={onChange} />
          </>
        ) : null}

        {activity.mode === "Prediction" ? (
          <>
            <FieldLabel>Linked market</FieldLabel>
            <select
              value={activity.marketId ?? ""}
              onChange={(event) => onChange({ marketId: event.target.value || undefined })}
              style={inputStyle}
            >
              <option value="">Not linked yet</option>
              {projectMarkets.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.question.slice(0, 70)}
                </option>
              ))}
            </select>
            {linkedMarket ? (
              <div
                style={{
                  marginTop: 8,
                  padding: 11,
                  borderRadius: 12,
                  background: "var(--paper-muted)",
                  fontSize: 11,
                  lineHeight: 1.55,
                }}
              >
                <Row gap={7} wrap>
                  <StatusPill value={linkedMarket.state} />
                  <span style={{ color: "var(--muted)" }}>
                    closes {linkedMarket.closes} · resolver {linkedMarket.resolver}
                  </span>
                </Row>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>
                  Rule: {linkedMarket.rule}
                </div>
              </div>
            ) : null}
            <div style={{ fontSize: 10, color: "var(--subtle)", marginTop: 6 }}>
              Timeline, token limits, resolution criteria, and opening are configured in
              Markets — creating a prediction never opens it.
            </div>
            <div style={{ marginTop: 10 }}>
              <FieldLabel>Reasoning guidance shown to participants</FieldLabel>
              <textarea
                value={activity.explanation ?? ""}
                onChange={(event) => onChange({ explanation: event.target.value })}
                rows={2}
                style={textareaStyle}
                placeholder="What evidence should a thoughtful forecaster weigh?"
              />
            </div>
          </>
        ) : null}
      </div>

      <Row gap={8} style={{ marginTop: 12 }}>
        <StatusPill value={activity.status} />
        <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
          Answer keys and scoring require human approval at the Learning quality gate.
        </span>
      </Row>
      <ModalFooter onRemove={onRemove} onClose={onClose} removeLabel="Remove activity" />
    </Modal>
  );
}

function RewardField({
  activity,
  onChange,
}: {
  activity: ActivityDraft;
  onChange: (patch: Partial<ActivityDraft>) => void;
}) {
  return (
    <div style={{ marginTop: 10, maxWidth: 160 }}>
      <FieldLabel>Token reward</FieldLabel>
      <input
        type="number"
        value={activity.reward ?? 0}
        onChange={(event) => onChange({ reward: Number(event.target.value) || 0 })}
        style={inputStyle}
      />
    </div>
  );
}

function OptionsEditor({
  options,
  correctIndex,
  onChange,
}: {
  options: string[];
  correctIndex?: number;
  onChange: (options: string[], correctIndex?: number) => void;
}) {
  const scored = correctIndex !== undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map((option, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {scored ? (
            <button
              title="Mark as the defensible answer"
              onClick={() => onChange(options, index)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                flexShrink: 0,
                border: `2px solid ${index === correctIndex ? "var(--forest)" : "var(--line)"}`,
                background: index === correctIndex ? "var(--forest)" : "var(--paper)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {index === correctIndex ? <Check size={12} color="var(--white)" /> : null}
            </button>
          ) : null}
          <input
            value={option}
            onChange={(event) => {
              const next = [...options];
              next[index] = event.target.value;
              onChange(next, correctIndex);
            }}
            style={{ ...inputStyle, flex: 1 }}
            placeholder={`Option ${index + 1}`}
          />
          <button
            title="Remove option"
            disabled={options.length <= 2}
            onClick={() => {
              const next = options.filter((_, i) => i !== index);
              const nextCorrect =
                correctIndex === undefined
                  ? undefined
                  : correctIndex === index
                    ? 0
                    : correctIndex > index
                      ? correctIndex - 1
                      : correctIndex;
              onChange(next, nextCorrect);
            }}
            style={{ opacity: options.length <= 2 ? 0.3 : 1, flexShrink: 0 }}
          >
            <Trash2 size={13} color="var(--muted)" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...options, ""], correctIndex)}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          color: "var(--forest)",
          fontSize: 11,
          fontWeight: 700,
          marginTop: 2,
        }}
      >
        <Plus size={12} /> Add option
      </button>
    </div>
  );
}

function PairsEditor({
  rows,
  onChange,
}: {
  rows: { left: string; right: string }[];
  onChange: (rows: { left: string; right: string }[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map((row, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={row.left}
            onChange={(event) => {
              const next = rows.map((item, i) =>
                i === index ? { ...item, left: event.target.value } : item,
              );
              onChange(next);
            }}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Concept"
          />
          <span style={{ color: "var(--subtle)", fontSize: 12, flexShrink: 0 }}>→</span>
          <input
            value={row.right}
            onChange={(event) => {
              const next = rows.map((item, i) =>
                i === index ? { ...item, right: event.target.value } : item,
              );
              onChange(next);
            }}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Match"
          />
          <button
            title="Remove pair"
            disabled={rows.length <= 2}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            style={{ opacity: rows.length <= 2 ? 0.3 : 1, flexShrink: 0 }}
          >
            <Trash2 size={13} color="var(--muted)" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...rows, { left: "", right: "" }])}
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          color: "var(--forest)",
          fontSize: 11,
          fontWeight: 700,
          marginTop: 2,
        }}
      >
        <Plus size={12} /> Add pair
      </button>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "6px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <span
        style={{
          width: 128,
          flexShrink: 0,
          fontSize: 10.5,
          color: "var(--muted)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12, minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
    >
      <span
        style={{
          width: 34,
          height: 20,
          borderRadius: 999,
          background: checked ? "var(--forest)" : "var(--line)",
          position: "relative",
          transition: "background 140ms ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 16 : 2,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "var(--white)",
            transition: "left 140ms ease",
          }}
        />
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
    </button>
  );
}

function ImportMarkdownModal({
  project,
  onClose,
  onApply,
}: {
  project: SourceProject;
  onClose: () => void;
  onApply: (parsed: ParsedDocument, mode: "replace" | "append") => void;
}) {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();
  const [dragging, setDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const parsed = useMemo(
    () => (source.trim() ? parseMarkdown(source, project) : undefined),
    [source, project],
  );

  const readFile = async (file: File) => {
    setFileName(file.name);
    setSource(await file.text());
  };

  const download = (contents: string, name: string) => {
    const blob = new Blob([contents], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      eyebrow="Import"
      title="Build the document from a markdown file"
      width={720}
      onClose={onClose}
    >
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void readFile(file);
        }}
        style={{
          display: "block",
          border: `1px dashed ${dragging ? "var(--forest)" : "var(--line)"}`,
          background: dragging ? "var(--paper)" : "var(--paper-muted)",
          borderRadius: 16,
          padding: "20px 16px",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <input
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
        <Upload size={20} color="var(--forest)" />
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 7 }}>
          {fileName ?? "Drop a .md file here, or click to choose"}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
          Paragraphs become summary text · <code>## FACT — …</code> becomes a statement ·{" "}
          <code>## QUIZ — …</code> becomes an activity
        </div>
      </label>

      <Row gap={10} style={{ marginTop: 10 }}>
        <button
          onClick={() => setShowGuide((prev) => !prev)}
          style={{ color: "var(--forest)", fontSize: 11, fontWeight: 700 }}
        >
          {showGuide ? "Hide format guide" : "Show format guide"}
        </button>
        <button
          onClick={() => download(SAMPLE_MARKDOWN, "perdisco-summary-template.md")}
          style={{ color: "var(--forest)", fontSize: 11, fontWeight: 700 }}
        >
          Download template.md
        </button>
        <button
          onClick={() =>
            download(aiInstructions, "perdisco-ai-import-instructions.md")
          }
          style={{ color: "var(--forest)", fontSize: 11, fontWeight: 700 }}
        >
          Download AI instructions
        </button>
        <button
          onClick={() => {
            setSource(SAMPLE_MARKDOWN);
            setFileName("template.md (sample)");
          }}
          style={{ color: "var(--forest)", fontSize: 11, fontWeight: 700 }}
        >
          Load sample
        </button>
      </Row>

      <div style={{ fontSize: 10.5, color: "var(--subtle)", marginTop: 6 }}>
        Drafting with AI? Send it the instructions above plus the transcript and RSS
        feed — it returns a file you can drop straight in.
      </div>

      {showGuide ? (
        <div
          style={{
            marginTop: 10,
            borderRadius: 14,
            border: "1px solid var(--line)",
            overflow: "hidden",
          }}
        >
          {FORMAT_GUIDE.map((entry, index) => (
            <div
              key={entry.syntax}
              style={{
                display: "flex",
                gap: 12,
                padding: "7px 12px",
                borderBottom:
                  index < FORMAT_GUIDE.length - 1 ? "1px solid var(--line)" : "none",
                background: index % 2 ? "var(--paper-muted)" : "var(--paper)",
              }}
            >
              <code
                style={{
                  width: 210,
                  flexShrink: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  color: "var(--forest)",
                }}
              >
                {entry.syntax}
              </code>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{entry.meaning}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <FieldLabel>Markdown — edit before importing if needed</FieldLabel>
        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          rows={7}
          spellCheck={false}
          style={{
            ...textareaStyle,
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            lineHeight: 1.6,
          }}
          placeholder="…or paste markdown directly"
        />
      </div>

      {parsed ? (
        <div style={{ marginTop: 12 }}>
          <Row gap={8} wrap style={{ marginBottom: 8 }}>
            <Eyebrow style={{ fontSize: 9 }}>Preview</Eyebrow>
            <span className="pill" style={{ background: "var(--paper-muted)", color: "var(--muted)" }}>
              {parsed.counts.text} text
            </span>
            <span className="pill" style={{ background: "var(--blue)", color: "var(--blue-dark)" }}>
              {parsed.counts.statements} statements
            </span>
            <span className="pill" style={{ background: "var(--lime)", color: "var(--lime-dark)" }}>
              {parsed.counts.activities} activities
            </span>
            {parsed.orientation ? (
              <span className="pill" style={{ background: "var(--paper-muted)", color: "var(--muted)" }}>
                orientation set
              </span>
            ) : null}
          </Row>

          <div
            style={{
              maxHeight: 190,
              overflowY: "auto",
              borderRadius: 14,
              border: "1px solid var(--line)",
            }}
          >
            {parsed.blocks.map((block, index) => {
              const statement =
                block.kind === "statement"
                  ? parsed.statements.find((item) => item.id === block.statementId)
                  : undefined;
              const activity =
                block.kind === "activity"
                  ? parsed.activities.find((item) => item.id === block.activityId)
                  : undefined;
              return (
                <div
                  key={block.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderBottom:
                      index < parsed.blocks.length - 1 ? "1px solid var(--line)" : "none",
                  }}
                >
                  {block.kind === "text" ? (
                    <span className="pill" style={{ background: "var(--paper-muted)", color: "var(--muted)" }}>
                      Text
                    </span>
                  ) : null}
                  {statement ? <TypeBadge type={statement.type} /> : null}
                  {activity ? (
                    <span className="pill" style={{ background: "var(--forest)", color: "var(--white)" }}>
                      {activity.mode}
                    </span>
                  ) : null}
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 11.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--ink)",
                    }}
                  >
                    {block.kind === "text"
                      ? block.text
                      : statement
                        ? statement.text
                        : activity?.prompt}
                  </span>
                  {statement ? (
                    <span style={{ fontSize: 9.5, color: "var(--subtle)", flexShrink: 0 }}>
                      {statement.locator}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {parsed.warnings.length > 0 ? (
            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                background: "var(--peach)",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  color: "var(--peach-dark)",
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                {parsed.warnings.length} thing{parsed.warnings.length > 1 ? "s" : ""} to fix after import
              </div>
              {parsed.warnings.slice(0, 6).map((warning, index) => (
                <div
                  key={index}
                  style={{ fontSize: 11, color: "var(--ink)", lineHeight: 1.5 }}
                >
                  · {warning}
                </div>
              ))}
              {parsed.warnings.length > 6 ? (
                <div style={{ fontSize: 10.5, color: "var(--peach-dark)", marginTop: 4 }}>
                  +{parsed.warnings.length - 6} more
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <Row style={{ marginTop: 16, justifyContent: "space-between" }} gap={10}>
        <span style={{ fontSize: 10.5, color: "var(--subtle)" }}>
          Imported content lands as drafts — review gates still apply.
        </span>
        <Row gap={8}>
          <PrimaryButton label="Cancel" variant="light" onClick={onClose} />
          <PrimaryButton
            label="Append"
            variant="light"
            disabled={!parsed || parsed.blocks.length === 0}
            onClick={() => parsed && onApply(parsed, "append")}
          />
          <PrimaryButton
            label={
              project.blocks.length > 0
                ? `Replace all ${project.blocks.length} blocks`
                : "Import"
            }
            disabled={!parsed || parsed.blocks.length === 0}
            onClick={() => parsed && onApply(parsed, "replace")}
          />
        </Row>
      </Row>
    </Modal>
  );
}
