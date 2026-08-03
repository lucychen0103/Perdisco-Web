import { supabase } from "./supabase";
import type {
  ActivityDraft,
  AdminMarket,
  AdminStatement,
  Finding,
  ModerationCase,
  Release,
  SourceProject,
} from "../types";

/**
 * Draft persistence. The database is the source of truth for editorial drafts:
 * the admin hydrates from `editorial.workspace_docs` on sign-in and writes
 * every edit back (debounced) through the admin_* workspace RPCs.
 *
 * Document scheme, mirrored in the migration:
 *   'project:<id>'  → { project, statements, activities } for one source project
 *   'findings' | 'markets' | 'releases' | 'cases' → operational collections
 */

export type ProjectDoc = {
  project: SourceProject;
  statements: AdminStatement[];
  activities: ActivityDraft[];
};

export type WorkspaceSnapshot = {
  projects: SourceProject[];
  statements: AdminStatement[];
  activities: ActivityDraft[];
  findings: Finding[];
  markets: AdminMarket[];
  releases: Release[];
  cases: ModerationCase[];
};

export type WorkspaceEntry = { key: string; doc: unknown };

export const projectDocKey = (projectId: string) => `project:${projectId}`;

const COLLECTION_KEYS = ["findings", "markets", "releases", "cases"] as const;

export async function loadWorkspaceDocs(): Promise<WorkspaceEntry[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("admin_load_workspace");
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkspaceEntry[];
}

export async function saveWorkspaceDocs(entries: WorkspaceEntry[]): Promise<void> {
  if (entries.length === 0) return;
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("admin_save_workspace_docs", {
    docs: entries.map(({ key, doc }) => ({ key, doc })),
  });
  if (error) throw new Error(error.message);
}

export async function deleteWorkspaceDoc(key: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("admin_delete_workspace_doc", {
    doc_key: key,
  });
  if (error) throw new Error(error.message);
}

/** Folds raw workspace docs into app state. */
export function snapshotFromDocs(entries: WorkspaceEntry[]): WorkspaceSnapshot {
  const snapshot: WorkspaceSnapshot = {
    projects: [],
    statements: [],
    activities: [],
    findings: [],
    markets: [],
    releases: [],
    cases: [],
  };

  for (const entry of entries) {
    if (entry.key.startsWith("project:")) {
      const doc = entry.doc as Partial<ProjectDoc> | null;
      if (!doc?.project) continue;
      snapshot.projects.push(doc.project);
      snapshot.statements.push(...(doc.statements ?? []));
      snapshot.activities.push(...(doc.activities ?? []));
      continue;
    }
    const collection = COLLECTION_KEYS.find((key) => key === entry.key);
    if (collection && Array.isArray(entry.doc)) {
      snapshot[collection] = entry.doc as never;
    }
  }

  return snapshot;
}

/** The inverse of snapshotFromDocs: app state as persistable doc entries. */
export function entriesFromSnapshot(snapshot: WorkspaceSnapshot): WorkspaceEntry[] {
  return [
    ...snapshot.projects.map((project) => ({
      key: projectDocKey(project.id),
      doc: {
        project,
        statements: snapshot.statements.filter((s) => s.projectId === project.id),
        activities: snapshot.activities.filter((a) => a.projectId === project.id),
      } satisfies ProjectDoc,
    })),
    ...COLLECTION_KEYS.map((key) => ({ key, doc: snapshot[key] })),
  ];
}
