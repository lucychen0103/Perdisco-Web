import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { backfillFromPublished } from "./lib/backfill";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import {
  deleteWorkspaceDoc,
  entriesFromSnapshot,
  loadWorkspaceDocs,
  saveWorkspaceDocs,
  snapshotFromDocs,
  type WorkspaceEntry,
  type WorkspaceSnapshot,
} from "./lib/workspace";
import {
  activityDrafts as seedActivities,
  findings as seedFindings,
  markets as seedMarkets,
  moderationCases as seedCases,
  projects as seedProjects,
  releases as seedReleases,
  statements as seedStatements,
} from "./data";
import type {
  ActivityDraft,
  AdminMarket,
  AdminStatement,
  Finding,
  GateName,
  GateStatus,
  ModerationCase,
  Release,
  SourceProject,
  SummaryBlock,
} from "./types";

type Toast = { id: number; message: string };

/**
 * Where drafts live this session.
 *   'local'      — Supabase not configured; in-memory only, lost on reload.
 *   'connecting' — restoring the auth session.
 *   'signed-out' — Supabase configured but no editorial user signed in.
 *   'loading'    — hydrating the workspace from the database.
 *   'ready'      — database-backed; every edit persists (debounced).
 *   'error'      — hydration failed; see workspaceError.
 */
export type WorkspaceStatus =
  | "local"
  | "connecting"
  | "signed-out"
  | "loading"
  | "ready"
  | "error";

type AppState = {
  route: string;
  navigate: (route: string) => void;
  session: Session | null;
  workspaceStatus: WorkspaceStatus;
  workspaceError: string | null;
  projects: SourceProject[];
  statements: AdminStatement[];
  activities: ActivityDraft[];
  findings: Finding[];
  markets: AdminMarket[];
  releases: Release[];
  cases: ModerationCase[];
  toasts: Toast[];
  notify: (message: string) => void;
  projectById: (id: string) => SourceProject | undefined;
  statementsFor: (projectId: string) => AdminStatement[];
  activitiesFor: (projectId: string) => ActivityDraft[];
  updateStatement: (id: string, patch: Partial<AdminStatement>) => void;
  addStatement: (statement: AdminStatement) => void;
  updateActivity: (id: string, patch: Partial<ActivityDraft>) => void;
  addActivity: (activity: ActivityDraft) => void;
  removeActivity: (id: string) => void;
  insertBlock: (projectId: string, block: SummaryBlock, afterBlockId?: string) => void;
  updateTextBlock: (projectId: string, blockId: string, text: string) => void;
  moveBlock: (projectId: string, blockId: string, direction: -1 | 1) => void;
  removeBlock: (projectId: string, blockId: string) => void;
  updateProject: (id: string, patch: Partial<SourceProject>) => void;
  addProject: (project: SourceProject) => void;
  removeProject: (id: string) => void;
  importDocument: (
    projectId: string,
    payload: {
      blocks: SummaryBlock[];
      statements: AdminStatement[];
      activities: ActivityDraft[];
    },
    mode: "replace" | "append",
  ) => void;
  setGate: (projectId: string, gate: GateName, status: GateStatus, reviewer?: string) => void;
  setFindingState: (id: string, state: Finding["state"]) => void;
  updateCase: (id: string, patch: Partial<ModerationCase>) => void;
  updateMarket: (id: string, patch: Partial<AdminMarket>) => void;
  /**
   * Drops local release rows that fail the predicate. Local rows are only the
   * scheduling queue — real release history lives in publishing.releases and is
   * fetched by the Publishing page — so this is how fulfilled or stale queue
   * entries leave the workspace.
   */
  pruneReleases: (keep: (release: Release) => boolean) => void;
  addRelease: (release: Release) => void;
};

const Ctx = createContext<AppState | null>(null);

const readRoute = () => window.location.hash.replace(/^#\/?/, "") || "home";

export function AppProvider({ children }: PropsWithChildren) {
  const [route, setRoute] = useState(readRoute);
  const [projects, setProjects] = useState(seedProjects);
  const [statements, setStatements] = useState(seedStatements);
  const [activities, setActivities] = useState(seedActivities);
  const [findings, setFindings] = useState(seedFindings);
  const [markets, setMarkets] = useState(seedMarkets);
  const [releases, setReleases] = useState(seedReleases);
  const [cases, setCases] = useState(seedCases);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>(
    isSupabaseConfigured ? "connecting" : "local",
  );
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  // Client-side serialization of the last state written to the database,
  // keyed by workspace doc key. Null until hydration completes.
  const lastSavedRef = useRef<Map<string, string> | null>(null);
  const persistTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const navigate = useCallback((next: string) => {
    window.location.hash = `/${next}`;
    window.scrollTo({ top: 0 });
  }, []);

  const notify = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  // Hydrate the workspace from the database once a session exists. If the
  // workspace has never been written, rebuild drafts from the published
  // consumer projection so pre-existing content appears in the admin.
  useEffect(() => {
    if (!isSupabaseConfigured || !authReady) return;
    if (!session) {
      hydratedRef.current = false;
      lastSavedRef.current = null;
      setWorkspaceStatus("signed-out");
      return;
    }
    if (hydratedRef.current) return;

    let cancelled = false;
    setWorkspaceStatus("loading");
    (async () => {
      try {
        const docs = await loadWorkspaceDocs();
        let snapshot: WorkspaceSnapshot | null = null;
        let restored = 0;
        if (docs.length > 0) {
          snapshot = snapshotFromDocs(docs);
        } else {
          snapshot = await backfillFromPublished();
          if (snapshot) {
            await saveWorkspaceDocs(entriesFromSnapshot(snapshot));
            restored = snapshot.projects.length;
          }
        }
        if (cancelled) return;
        if (snapshot) {
          setProjects(snapshot.projects);
          setStatements(snapshot.statements);
          setActivities(snapshot.activities);
          setFindings(snapshot.findings);
          setMarkets(snapshot.markets);
          setReleases(snapshot.releases);
          setCases(snapshot.cases);
          lastSavedRef.current = new Map(
            entriesFromSnapshot(snapshot).map((entry) => [
              entry.key,
              JSON.stringify(entry.doc),
            ]),
          );
        } else {
          lastSavedRef.current = new Map();
        }
        hydratedRef.current = true;
        setWorkspaceError(null);
        setWorkspaceStatus("ready");
        if (restored > 0) {
          notify(
            `Restored ${restored} published ${restored === 1 ? "summary" : "summaries"} from the database`,
          );
        }
      } catch (error) {
        if (cancelled) return;
        setWorkspaceError((error as Error).message);
        setWorkspaceStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, authReady, notify]);

  // Persist edits: whenever hydrated state changes, diff it against the last
  // saved docs and write the changed ones after a short debounce.
  useEffect(() => {
    const lastSaved = lastSavedRef.current;
    if (workspaceStatus !== "ready" || !lastSaved) {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
      return;
    }

    const entries = entriesFromSnapshot({
      projects,
      statements,
      activities,
      findings,
      markets,
      releases,
      cases,
    });
    const dirty: { entry: WorkspaceEntry; serialized: string }[] = [];
    const currentKeys = new Set<string>();
    for (const entry of entries) {
      currentKeys.add(entry.key);
      const serialized = JSON.stringify(entry.doc);
      if (lastSaved.get(entry.key) !== serialized) dirty.push({ entry, serialized });
    }
    const removed = [...lastSaved.keys()].filter((key) => !currentKeys.has(key));
    if (dirty.length === 0 && removed.length === 0) return;

    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(async () => {
      try {
        await saveWorkspaceDocs(dirty.map((item) => item.entry));
        for (const key of removed) await deleteWorkspaceDoc(key);
        for (const item of dirty) lastSaved.set(item.entry.key, item.serialized);
        for (const key of removed) lastSaved.delete(key);
      } catch (error) {
        notify(`Could not save to the database: ${(error as Error).message}`);
      }
    }, 800);
  }, [
    projects,
    statements,
    activities,
    findings,
    markets,
    releases,
    cases,
    workspaceStatus,
    notify,
  ]);

  const updateStatement = useCallback(
    (id: string, patch: Partial<AdminStatement>) => {
      setStatements((prev) =>
        prev.map((statement) =>
          statement.id === id ? { ...statement, ...patch } : statement,
        ),
      );
    },
    [],
  );

  const addStatement = useCallback((statement: AdminStatement) => {
    setStatements((prev) => [...prev, statement]);
  }, []);

  const updateActivity = useCallback((id: string, patch: Partial<ActivityDraft>) => {
    setActivities((prev) =>
      prev.map((activity) => (activity.id === id ? { ...activity, ...patch } : activity)),
    );
  }, []);

  const addActivity = useCallback((activity: ActivityDraft) => {
    setActivities((prev) => [...prev, activity]);
  }, []);

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((activity) => activity.id !== id));
    // Drop any elaboration block that pointed at the removed activity.
    setStatements((prev) =>
      prev.map((statement) =>
        statement.elaborationBlocks?.some(
          (block) => block.kind === "activity" && block.activityId === id,
        )
          ? {
              ...statement,
              elaborationBlocks: statement.elaborationBlocks.filter(
                (block) => !(block.kind === "activity" && block.activityId === id),
              ),
            }
          : statement,
      ),
    );
  }, []);

  const insertBlock = useCallback(
    (projectId: string, block: SummaryBlock, afterBlockId?: string) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          const blocks = [...project.blocks];
          const index = afterBlockId
            ? blocks.findIndex((item) => item.id === afterBlockId)
            : -1;
          if (index >= 0) blocks.splice(index + 1, 0, block);
          else blocks.push(block);
          return { ...project, blocks, updatedAt: "Just now" };
        }),
      );
    },
    [],
  );

  const updateTextBlock = useCallback(
    (projectId: string, blockId: string, text: string) => {
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? {
                ...project,
                blocks: project.blocks.map((block) =>
                  block.id === blockId && block.kind === "text"
                    ? { ...block, text }
                    : block,
                ),
              }
            : project,
        ),
      );
    },
    [],
  );

  const moveBlock = useCallback(
    (projectId: string, blockId: string, direction: -1 | 1) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          const blocks = [...project.blocks];
          const index = blocks.findIndex((block) => block.id === blockId);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= blocks.length) return project;
          [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
          return { ...project, blocks, updatedAt: "Just now" };
        }),
      );
    },
    [],
  );

  const removeBlock = useCallback(
    (projectId: string, blockId: string) => {
      const project = projects.find((item) => item.id === projectId);
      const block = project?.blocks.find((item) => item.id === blockId);
      setProjects((prev) =>
        prev.map((item) =>
          item.id === projectId
            ? {
                ...item,
                blocks: item.blocks.filter((entry) => entry.id !== blockId),
                updatedAt: "Just now",
              }
            : item,
        ),
      );
      if (block?.kind === "statement") {
        // A statement owns its elaboration document, so its inline activities
        // leave with it.
        const statement = statements.find((item) => item.id === block.statementId);
        const elabActivityIds = new Set(
          (statement?.elaborationBlocks ?? []).flatMap((item) =>
            item.kind === "activity" ? [item.activityId] : [],
          ),
        );
        setStatements((prev) => prev.filter((item) => item.id !== block.statementId));
        if (elabActivityIds.size > 0) {
          setActivities((prev) => prev.filter((item) => !elabActivityIds.has(item.id)));
        }
      }
      if (block?.kind === "activity") {
        setActivities((prev) => prev.filter((item) => item.id !== block.activityId));
      }
    },
    [projects, statements],
  );

  const updateProject = useCallback((id: string, patch: Partial<SourceProject>) => {
    setProjects((prev) =>
      prev.map((project) => (project.id === id ? { ...project, ...patch } : project)),
    );
  }, []);

  const addProject = useCallback((project: SourceProject) => {
    setProjects((prev) => [project, ...prev]);
  }, []);

  /**
   * Drops a project and everything scoped to it. Statements and activities are
   * serialized inside the project's workspace doc, so they have to go with it;
   * findings and releases are project-scoped records that would otherwise be
   * unreachable rows pointing at a project that no longer exists.
   *
   * Markets and moderation cases are deliberately kept. They reference a project
   * but represent obligations to readers — staked tokens, reports about user
   * conduct — that should not disappear because an editor deleted a source.
   *
   * This removes the draft only. Withdrawing the published copy is the caller's
   * job (see withdrawProject); the two are ordered so nothing is deleted here
   * until the consumer surface is already clear.
   */
  const removeProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
    setStatements((prev) => prev.filter((statement) => statement.projectId !== id));
    setActivities((prev) => prev.filter((activity) => activity.projectId !== id));
    setFindings((prev) => prev.filter((finding) => finding.projectId !== id));
    setReleases((prev) => prev.filter((release) => release.projectId !== id));
  }, []);

  const importDocument = useCallback<AppState["importDocument"]>(
    (projectId, payload, mode) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          const blocks =
            mode === "replace" ? payload.blocks : [...project.blocks, ...payload.blocks];
          return {
            ...project,
            blocks,
            updatedAt: "Just now",
          };
        }),
      );
      setStatements((prev) => {
        const kept =
          mode === "replace" ? prev.filter((item) => item.projectId !== projectId) : prev;
        return [...kept, ...payload.statements];
      });
      setActivities((prev) => {
        const kept =
          mode === "replace" ? prev.filter((item) => item.projectId !== projectId) : prev;
        return [...kept, ...payload.activities];
      });
    },
    [],
  );

  const setGate = useCallback(
    (projectId: string, gate: GateName, status: GateStatus, reviewer?: string) => {
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId
            ? {
                ...project,
                gates: project.gates.map((g) =>
                  g.name === gate ? { ...g, status, reviewer: reviewer ?? g.reviewer } : g,
                ),
              }
            : project,
        ),
      );
    },
    [],
  );

  const setFindingState = useCallback((id: string, state: Finding["state"]) => {
    setFindings((prev) =>
      prev.map((finding) => (finding.id === id ? { ...finding, state } : finding)),
    );
  }, []);

  const updateCase = useCallback((id: string, patch: Partial<ModerationCase>) => {
    setCases((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const updateMarket = useCallback((id: string, patch: Partial<AdminMarket>) => {
    setMarkets((prev) =>
      prev.map((market) => (market.id === id ? { ...market, ...patch } : market)),
    );
  }, []);

  const pruneReleases = useCallback((keep: (release: Release) => boolean) => {
    // Keep the same array when nothing matches so callers can invoke this
    // after every history refresh without churning state or persistence.
    setReleases((prev) => (prev.every(keep) ? prev : prev.filter(keep)));
  }, []);

  const addRelease = useCallback((release: Release) => {
    setReleases((prev) => [release, ...prev]);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      route,
      navigate,
      session,
      workspaceStatus,
      workspaceError,
      projects,
      statements,
      activities,
      findings,
      markets,
      releases,
      cases,
      toasts,
      notify,
      projectById: (id) => projects.find((project) => project.id === id),
      statementsFor: (projectId) => {
        const project = projects.find((item) => item.id === projectId);
        if (!project) return [];
        return project.blocks
          .filter((block): block is Extract<SummaryBlock, { kind: "statement" }> =>
            block.kind === "statement",
          )
          .map((block) => statements.find((statement) => statement.id === block.statementId))
          .filter((statement): statement is AdminStatement => Boolean(statement));
      },
      activitiesFor: (projectId) =>
        activities.filter((activity) => activity.projectId === projectId),
      updateStatement,
      addStatement,
      updateActivity,
      addActivity,
      removeActivity,
      insertBlock,
      updateTextBlock,
      moveBlock,
      removeBlock,
      updateProject,
      addProject,
      removeProject,
      importDocument,
      setGate,
      setFindingState,
      updateCase,
      updateMarket,
      pruneReleases,
      addRelease,
    }),
    [
      route,
      navigate,
      session,
      workspaceStatus,
      workspaceError,
      projects,
      statements,
      activities,
      findings,
      markets,
      releases,
      cases,
      toasts,
      notify,
      updateStatement,
      addStatement,
      updateActivity,
      addActivity,
      removeActivity,
      insertBlock,
      updateTextBlock,
      moveBlock,
      removeBlock,
      updateProject,
      addProject,
      removeProject,
      importDocument,
      setGate,
      setFindingState,
      updateCase,
      updateMarket,
      pruneReleases,
      addRelease,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
