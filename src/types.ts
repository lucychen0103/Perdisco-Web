export type StatementType = "FACT" | "OPINION" | "FORECAST" | "MENTAL MODEL";

export type SourceFormat =
  | "Podcast"
  | "Video"
  | "Interview"
  | "Article"
  | "Research paper";

export type LifecycleState =
  | "Draft"
  | "Processing"
  | "Blocked"
  | "Ready for review"
  | "In review"
  | "Changes requested"
  | "Approved"
  | "Scheduled"
  | "Published"
  | "Corrected"
  | "Withdrawn"
  | "Archived";

export type RoleName =
  | "Producer"
  | "Editor"
  | "Reviewer"
  | "Publisher"
  | "Moderator"
  | "Market resolver"
  | "Administrator";

export type Person = {
  id: string;
  name: string;
  initials: string;
  roles: RoleName[];
  email: string;
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
};

export type RightsStatus = "Cleared" | "Pending review" | "Expiring" | "Missing" | "Restricted";

export type RightsRecord = {
  owner: string;
  basis: string;
  approvedUses: string[];
  restrictions: string;
  mediaBehavior: string;
  expiry: string;
  takedownContact: string;
  status: RightsStatus;
  reviewer: string;
};

export type ProcessingStep = {
  name: string;
  status: "Complete" | "Running" | "Failed" | "Waiting" | "Needs review";
  detail: string;
};

export type GateName =
  | "Editorial fidelity"
  | "Evidence & research"
  | "Rights & source use"
  | "Learning quality"
  | "Community"
  | "Market"
  | "Accessibility & technical";

export type GateStatus = "Not started" | "In review" | "Approved" | "Changes requested" | "Blocked";

export type ReviewGate = {
  name: GateName;
  status: GateStatus;
  reviewer?: string;
  note?: string;
};

export type FindingSeverity = "Blocker" | "Major" | "Minor";

export type Finding = {
  id: string;
  projectId: string;
  gate: GateName;
  target: string;
  severity: FindingSeverity;
  note: string;
  author: string;
  state: "Open" | "Resolved" | "Won't fix";
  createdAt: string;
};

export type Blocker = {
  object: string;
  reason: string;
  responsibleRole: RoleName;
  resolution: string;
  overridable: boolean;
};

export type AdminStatement = {
  id: string;
  projectId: string;
  type: StatementType;
  text: string;
  context: string;
  locator: string;
  sourceMoment: string;
  supportingSource: string;
  supportingUrl: string;
  topic: string;
  learningEligible: boolean;
  attribution: string;
  anchor: string;
  aiSuggested: boolean;
  aiModelRun?: string;
  elaborationState: "Complete" | "Draft" | "Empty";
  discussionEnabled: boolean;
};

/**
 * One entry in the ordered summary document. The consumer summary renders
 * blocks top to bottom: prose, statements, and inline activities may be
 * stacked and reordered freely.
 */
export type SummaryBlock =
  | { kind: "text"; id: string; text: string }
  | { kind: "statement"; id: string; statementId: string }
  | { kind: "activity"; id: string; activityId: string };

export type SourceProject = {
  id: string;
  title: string;
  shortTitle: string;
  format: SourceFormat;
  medium: "audio" | "video" | "text" | "pdf";
  creator: string;
  creatorRole: string;
  publisher: string;
  canonicalUrl: string;
  published: string;
  duration: string;
  category: string;
  initials: string;
  gradient: [string, string];
  language: string;
  state: LifecycleState;
  owner: string;
  contributors: string[];
  workspace: string;
  organization: string;
  priority: "High" | "Normal" | "Low";
  targetRelease: string;
  updatedAt: string;
  blocks: SummaryBlock[];
  rights: RightsRecord;
  processing: ProcessingStep[];
  gates: ReviewGate[];
  blockers: Blocker[];
  version: number;
  playback: {
    primary: string;
    fallback?: string;
    transcriptSource: string;
    transcriptState: "Aligned" | "Low confidence" | "Missing";
  };
};

export type ReleaseState =
  | "Scheduled"
  | "Publishing"
  | "Live"
  | "Corrected"
  | "Withdrawn"
  | "Failed"
  | "Rolled back";

export type Release = {
  id: string;
  projectId: string;
  version: number;
  state: ReleaseState;
  when: string;
  publisher: string;
  cohort: string;
  health: "Healthy" | "Degraded" | "Failing" | "—";
  note?: string;
};

export type ModerationCase = {
  id: string;
  kind: "Comment report" | "Thread report" | "Appeal" | "Account review";
  severity: "High" | "Medium" | "Low";
  status: "New" | "In review" | "Actioned" | "Appealed" | "Closed";
  projectId: string;
  statementId?: string;
  reportedUser: string;
  excerpt: string;
  reports: number;
  aiSignal: string;
  slaHours: number;
  assignee?: string;
};

export type MarketState =
  | "Draft"
  | "In review"
  | "Scheduled"
  | "Open"
  | "Closing"
  | "Awaiting resolution"
  | "Disputed"
  | "Resolved"
  | "Void";

export type AdminMarket = {
  id: string;
  projectId: string;
  statementId: string;
  question: string;
  state: MarketState;
  closes: string;
  resolves: string;
  communityProbability: number;
  committedTokens: number;
  participants: number;
  concentration: string;
  minStake: number;
  maxStake: number;
  resolutionSource: string;
  rule: string;
  resolver: string;
  flag?: string;
};

export type Asset = {
  id: string;
  projectId: string;
  kind:
    | "Audio"
    | "Video"
    | "Transcript"
    | "Document"
    | "Image"
    | "Captions"
    | "Rights evidence";
  name: string;
  status: "Ready" | "Processing" | "Failed" | "Needs review";
  meta: string;
  updatedAt: string;
};

export type AuditEvent = {
  id: string;
  time: string;
  actor: string;
  role: RoleName;
  action: string;
  object: string;
  detail: string;
  protected: boolean;
};

export type ActivityMode =
  | "Flashcard"
  | "Applied quiz"
  | "Matching"
  | "Poll"
  | "Prediction";

export type ActivityDraft = {
  id: string;
  projectId: string;
  statementId: string;
  mode: ActivityMode;
  prompt: string;
  status: "Approved" | "Draft" | "In review";
  aiSuggested: boolean;
  explanation?: string;
  reward?: number;
  /** Per-mode fields mirroring the consumer app's Activity contract */
  answer?: string;
  options?: string[];
  correctIndex?: number;
  matchingRows?: { left: string; right: string }[];
  marketId?: string;
};

export type QueueAlert = {
  id: string;
  tone: "danger" | "warn" | "info";
  title: string;
  detail: string;
  destination: string;
};
