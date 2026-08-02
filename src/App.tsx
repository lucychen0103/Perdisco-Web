import {
  Archive,
  ClipboardCheck,
  FolderOpen,
  House,
  MessagesSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { people } from "./data";
import { AdminPage } from "./pages/AdminPage";
import { AssetsPage } from "./pages/AssetsPage";
import { CommunityPage } from "./pages/CommunityPage";
import { HomePage } from "./pages/HomePage";
import { MarketsPage } from "./pages/MarketsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { PublishingPage } from "./pages/PublishingPage";
import { QuestionsPage } from "./pages/QuestionsPage";
import { ReviewPage } from "./pages/ReviewPage";
import { useApp } from "./state";
import type { SourceFormat, SourceProject } from "./types";
import { Avatar, Eyebrow, FieldLabel, PrimaryButton, StatusPill, inputStyle } from "./ui";

const NAV = [
  { key: "home", label: "Home", icon: House, hint: "My work and alerts" },
  { key: "projects", label: "Projects", icon: FolderOpen, hint: "All source projects" },
  { key: "review", label: "Review", icon: ClipboardCheck, hint: "Approval queues" },
  { key: "questions", label: "Questions", icon: Sparkles, hint: "AI question drafts" },
  { key: "publishing", label: "Publishing", icon: Send, hint: "Releases and health" },
  { key: "community", label: "Community", icon: MessagesSquare, hint: "Moderation" },
  { key: "markets", label: "Markets", icon: TrendingUp, hint: "Prediction operations" },
  { key: "assets", label: "Assets", icon: Archive, hint: "Media and rights" },
  { key: "admin", label: "Administration", icon: ShieldCheck, hint: "People and policy" },
];

export function App() {
  const { route, navigate, toasts } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const section = route.split("/")[0];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setCreateOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          borderRight: "1px solid var(--line)",
          padding: "22px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "0 10px 18px" }}>
          <Eyebrow style={{ fontSize: 9 }}>Internal · Editorial OS</Eyebrow>
          <div className="display" style={{ fontSize: 27, lineHeight: "31px" }}>
            Perdisco
            <span style={{ color: "var(--forest)", fontSize: 13, marginLeft: 7, letterSpacing: 2 }}>
              ADMIN
            </span>
          </div>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: "var(--forest)",
            color: "var(--white)",
            borderRadius: 15,
            padding: "12px 14px",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          <Plus size={16} strokeWidth={2.6} />
          Create source project
        </button>

        {NAV.map((item) => {
          const active =
            section === item.key || (item.key === "projects" && section === "project");
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "10px 12px",
                borderRadius: 14,
                background: active ? "var(--paper)" : "transparent",
                border: active ? "1px solid var(--line)" : "1px solid transparent",
                color: active ? "var(--forest)" : "var(--muted)",
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                textAlign: "left",
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </button>
          );
        })}

        <div style={{ marginTop: "auto", padding: "14px 10px 0", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar initials="LC" size={36} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Lucy Chen</div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>
                Editor · Publisher · Admin
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: "var(--background)",
            borderBottom: "1px solid var(--line)",
            padding: "12px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              flex: 1,
              maxWidth: 460,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "9px 13px",
              color: "var(--subtle)",
              fontSize: 12,
            }}
          >
            <Search size={15} />
            Search projects, statements, people, markets…
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--muted)",
                background: "var(--paper-muted)",
                borderRadius: 6,
                padding: "2px 6px",
              }}
            >
              ⌘K
            </span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusPill value="Production" />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              Perdisco org · Editorial workspace
            </span>
          </div>
        </header>

        <main style={{ flex: 1, padding: "26px 28px 80px", minWidth: 0 }}>
          {section === "home" && <HomePage />}
          {(section === "projects" || section === "") && <ProjectsPage />}
          {section === "project" && <ProjectDetailPage id={route.split("/")[1]} />}
          {section === "review" && <ReviewPage />}
          {section === "questions" && <QuestionsPage />}
          {section === "publishing" && <PublishingPage />}
          {section === "community" && <CommunityPage />}
          {section === "markets" && <MarketsPage />}
          {section === "assets" && <AssetsPage />}
          {section === "admin" && <AdminPage />}
        </main>
      </div>

      {searchOpen ? <SearchOverlay onClose={() => setSearchOpen(false)} /> : null}
      {createOpen ? <CreateProjectModal onClose={() => setCreateOpen(false)} /> : null}

      <div
        style={{
          position: "fixed",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 90,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: "var(--forest-dark)",
              color: "var(--white)",
              borderRadius: 14,
              padding: "11px 18px",
              fontSize: 12,
              fontWeight: 700,
              boxShadow: "var(--shadow)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { projects, statements, markets, navigate } = useApp();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const match = (text: string) => text.toLowerCase().includes(q);
    return {
      projects: projects.filter(
        (project) => match(project.title) || match(project.creator) || match(project.category),
      ),
      statements: statements.filter(
        (statement) => match(statement.text) || match(statement.topic),
      ),
      people: people.filter((person) => match(person.name) || match(person.roles.join(" "))),
      markets: markets.filter((market) => match(market.question)),
    };
  }, [query, projects, statements, markets]);

  const go = (route: string) => {
    navigate(route);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23,33,28,0.32)",
        zIndex: 80,
        display: "flex",
        justifyContent: "center",
        paddingTop: 90,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="card"
        style={{
          width: 620,
          maxHeight: "70vh",
          overflowY: "auto",
          borderRadius: 22,
          padding: 18,
          alignSelf: "flex-start",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Search size={16} color="var(--forest)" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search everything you have permission to see…"
            style={{ ...inputStyle, border: "none", fontSize: 15, padding: "6px 0" }}
          />
          <button className="icon-button" onClick={onClose} style={{ width: 32, height: 32 }}>
            <X size={15} />
          </button>
        </div>

        {results ? (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
            {results.projects.length > 0 && (
              <ResultGroup label="Projects">
                {results.projects.map((project) => (
                  <ResultRow
                    key={project.id}
                    title={project.title}
                    meta={`${project.format} · ${project.state} · ${project.owner}`}
                    pill={project.state}
                    onClick={() => go(`project/${project.id}`)}
                  />
                ))}
              </ResultGroup>
            )}
            {results.statements.length > 0 && (
              <ResultGroup label="Statements — opens composer at anchor">
                {results.statements.map((statement) => (
                  <ResultRow
                    key={statement.id}
                    title={statement.text}
                    meta={`${statement.type} · ${statement.anchor}`}
                    pill={statement.type}
                    onClick={() => go(`project/${statement.projectId}/statement/${statement.id}`)}
                  />
                ))}
              </ResultGroup>
            )}
            {results.people.length > 0 && (
              <ResultGroup label="People">
                {results.people.map((person) => (
                  <ResultRow
                    key={person.id}
                    title={person.name}
                    meta={person.roles.join(" · ")}
                    onClick={() => go("admin")}
                  />
                ))}
              </ResultGroup>
            )}
            {results.markets.length > 0 && (
              <ResultGroup label="Markets">
                {results.markets.map((market) => (
                  <ResultRow
                    key={market.id}
                    title={market.question}
                    meta={`${market.state} · resolver ${market.resolver}`}
                    onClick={() => go("markets")}
                  />
                ))}
              </ResultGroup>
            )}
            {Object.values(results).every((list) => list.length === 0) && (
              <div style={{ color: "var(--muted)", fontSize: 12, padding: 8 }}>
                No permitted results. Withdrawn and restricted objects never appear in search.
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: "var(--subtle)", fontSize: 11, marginTop: 10 }}>
            Results are permission-aware and distinguish drafts from published versions.
          </div>
        )}
      </div>
    </div>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Eyebrow style={{ fontSize: 9, color: "var(--muted)", marginBottom: 6 }}>{label}</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function ResultRow({
  title,
  meta,
  pill,
  onClick,
}: {
  title: string;
  meta: string;
  pill?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 11px",
        borderRadius: 12,
        background: "var(--paper-muted)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{meta}</div>
      </div>
      {pill ? <StatusPill value={pill} /> : null}
    </button>
  );
}

const FORMATS: SourceFormat[] = ["Podcast", "Video", "Interview", "Article", "Research paper"];

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const { navigate, notify } = useApp();
  const { addProject } = useAddProject();
  const [format, setFormat] = useState<SourceFormat>("Podcast");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [url, setUrl] = useState("");
  const [rightsBasis, setRightsBasis] = useState("Platform terms — pending review");

  const create = () => {
    if (!title.trim()) {
      notify("A source title is required before intake can begin");
      return;
    }
    const id = `p-${Date.now().toString(36)}`;
    addProject({
      id,
      title: title.trim(),
      format,
      creator: creator.trim() || "Unknown creator",
      canonicalUrl: url.trim() || "—",
      rightsBasis,
    });
    notify("Source project created — intake stage");
    onClose();
    navigate(`project/${id}`);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23,33,28,0.32)",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="card"
        style={{ width: 520, borderRadius: 24, padding: 24, boxShadow: "var(--shadow)" }}
      >
        <Eyebrow style={{ fontSize: 9 }}>New source project</Eyebrow>
        <div className="display" style={{ fontSize: 24, marginTop: 4 }}>
          Start with the source, not an empty record
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6, marginBottom: 18 }}>
          Intake records identity, ownership, and rights basis first. Assets and processing
          follow on the project page.
        </div>

        <FieldLabel>Source format</FieldLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {FORMATS.map((item) => (
            <button
              key={item}
              onClick={() => setFormat(item)}
              className="pill"
              style={{
                padding: "8px 13px",
                fontSize: 10,
                background: format === item ? "var(--forest)" : "var(--paper-muted)",
                color: format === item ? "var(--white)" : "var(--muted)",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <FieldLabel>Source title</FieldLabel>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Exact title of the episode, paper, or article"
          style={{ ...inputStyle, marginBottom: 12 }}
        />

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Creator or publication</FieldLabel>
            <input
              value={creator}
              onChange={(event) => setCreator(event.target.value)}
              placeholder="Who made it"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Canonical URL</FieldLabel>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              style={inputStyle}
            />
          </div>
        </div>

        <FieldLabel>Rights basis</FieldLabel>
        <select
          value={rightsBasis}
          onChange={(event) => setRightsBasis(event.target.value)}
          style={{ ...inputStyle, marginBottom: 8 }}
        >
          <option>Platform terms — pending review</option>
          <option>Written permission on file</option>
          <option>Open-access license</option>
          <option>First-party Perdisco content</option>
          <option>Unknown — requires rights review</option>
        </select>
        <div style={{ fontSize: 10, color: "var(--subtle)", marginBottom: 18 }}>
          {format === "Podcast"
            ? "Podcasts additionally require a playable RSS episode or YouTube source before composition."
            : "Ownership defaults to the Perdisco organization · Editorial workspace."}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <PrimaryButton label="Cancel" variant="light" onClick={onClose} />
          <PrimaryButton label="Create project" onClick={create} />
        </div>
      </div>
    </div>
  );
}

function useAddProject() {
  const { addProject: persist } = useApp();
  const addProject = (input: {
    id: string;
    title: string;
    format: SourceFormat;
    creator: string;
    canonicalUrl: string;
    rightsBasis: string;
  }) => {
    const project: SourceProject = {
      id: input.id,
      title: input.title,
      shortTitle: input.title.length > 32 ? `${input.title.slice(0, 32)}…` : input.title,
      format: input.format,
      medium:
        input.format === "Podcast"
          ? "audio"
          : input.format === "Video" || input.format === "Interview"
            ? "video"
            : input.format === "Research paper"
              ? "pdf"
              : "text",
      creator: input.creator,
      creatorRole: "—",
      publisher: input.creator,
      canonicalUrl: input.canonicalUrl,
      published: "—",
      duration: "—",
      category: "UNCATEGORIZED",
      initials: input.creator
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "??",
      gradient: ["#C8D98C", "#315A47"],
      language: "English",
      state: "Draft",
      owner: "Lucy Chen",
      contributors: [],
      workspace: "Editorial",
      organization: "Perdisco",
      priority: "Normal",
      targetRelease: "Unscheduled",
      updatedAt: "Just now",
      blocks: [],
      rights: {
        owner: input.creator,
        basis: input.rightsBasis,
        approvedUses: ["Ingest"],
        restrictions: "Pending rights review",
        mediaBehavior: "Undetermined",
        expiry: "—",
        takedownContact: "rights@perdisco.app",
        status: input.rightsBasis.includes("pending") || input.rightsBasis.includes("Unknown")
          ? "Pending review"
          : "Cleared",
        reviewer: "—",
      },
      processing: [
        { name: "Media inspection", status: "Waiting", detail: "Awaiting assets" },
        { name: "Preflight", status: "Waiting", detail: "—" },
      ],
      gates: [
        { name: "Editorial fidelity", status: "Not started" },
        { name: "Evidence & research", status: "Not started" },
        { name: "Rights & source use", status: "Not started" },
        { name: "Learning quality", status: "Not started" },
        { name: "Community", status: "Not started" },
        { name: "Market", status: "Not started" },
        { name: "Accessibility & technical", status: "Not started" },
      ],
      // Transcript intake is disabled for now: podcasts get no transcription step
      // or transcript blocker, and the intake tab hides transcript fields.
      blockers: [],
      version: 1,
      playback: {
        primary: input.format === "Podcast" ? "RSS · unresolved" : "—",
        transcriptSource: input.format === "Podcast" ? "Missing" : "Not applicable",
        transcriptState: input.format === "Podcast" ? "Missing" : "Aligned",
      },
    };
    persist(project);
    return project;
  };
  return { addProject };
}
