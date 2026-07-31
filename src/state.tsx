import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
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

type AppState = {
  route: string;
  navigate: (route: string) => void;
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
  insertBlock: (projectId: string, block: SummaryBlock, afterBlockId?: string) => void;
  updateTextBlock: (projectId: string, blockId: string, text: string) => void;
  moveBlock: (projectId: string, blockId: string, direction: -1 | 1) => void;
  removeBlock: (projectId: string, blockId: string) => void;
  updateProject: (id: string, patch: Partial<SourceProject>) => void;
  addProject: (project: SourceProject) => void;
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
  updateRelease: (id: string, patch: Partial<Release>) => void;
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

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
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
        setStatements((prev) => prev.filter((item) => item.id !== block.statementId));
      }
      if (block?.kind === "activity") {
        setActivities((prev) => prev.filter((item) => item.id !== block.activityId));
      }
    },
    [projects],
  );

  const updateProject = useCallback((id: string, patch: Partial<SourceProject>) => {
    setProjects((prev) =>
      prev.map((project) => (project.id === id ? { ...project, ...patch } : project)),
    );
  }, []);

  const addProject = useCallback((project: SourceProject) => {
    setProjects((prev) => [project, ...prev]);
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

  const updateRelease = useCallback((id: string, patch: Partial<Release>) => {
    setReleases((prev) =>
      prev.map((release) => (release.id === id ? { ...release, ...patch } : release)),
    );
  }, []);

  const addRelease = useCallback((release: Release) => {
    setReleases((prev) => [release, ...prev]);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      route,
      navigate,
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
      insertBlock,
      updateTextBlock,
      moveBlock,
      removeBlock,
      updateProject,
      addProject,
      importDocument,
      setGate,
      setFindingState,
      updateCase,
      updateMarket,
      updateRelease,
      addRelease,
    }),
    [
      route,
      navigate,
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
      insertBlock,
      updateTextBlock,
      moveBlock,
      removeBlock,
      updateProject,
      addProject,
      importDocument,
      setGate,
      setFindingState,
      updateCase,
      updateMarket,
      updateRelease,
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
