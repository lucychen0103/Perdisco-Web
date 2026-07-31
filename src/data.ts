import type {
  ActivityDraft,
  AdminMarket,
  AdminStatement,
  Asset,
  AuditEvent,
  Finding,
  ModerationCase,
  Person,
  QueueAlert,
  Release,
  SourceProject,
  StatementType,
} from "./types";

/**
 * Seed content for the admin platform.
 *
 * Emptied for a clean start — the workspace begins with no source projects,
 * statements, activities, markets, or operational cases. Create a project from
 * the sidebar, or build one from a markdown file via Composer → Import markdown.
 *
 * Only the signed-in user remains, since ownership, the sidebar identity, and
 * default assignment reference them.
 */

export const people: Person[] = [
  {
    id: "lucy",
    name: "Lucy Chen",
    initials: "LC",
    roles: ["Editor", "Publisher", "Administrator"],
    email: "lucy@perdisco.app",
    status: "Active",
    lastActive: "Now",
  },
];

export const projects: SourceProject[] = [];

export const statements: AdminStatement[] = [];

export type AiSuggestion = {
  id: string;
  projectId: string;
  type: StatementType;
  text: string;
  locator: string;
  modelRun: string;
  confidence: string;
  note: string;
};

export const aiSuggestions: AiSuggestion[] = [];

export const findings: Finding[] = [];

export const releases: Release[] = [];

export const moderationCases: ModerationCase[] = [];

export const markets: AdminMarket[] = [];

export const assets: Asset[] = [];

export const activityDrafts: ActivityDraft[] = [];

export const auditEvents: AuditEvent[] = [];

export const alerts: QueueAlert[] = [];
