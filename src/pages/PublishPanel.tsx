import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CloudUpload, LogOut, ShieldCheck } from "lucide-react";
import { publishProject } from "../lib/publish";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useApp } from "../state";
import { Card, Eyebrow, FieldLabel, PrimaryButton, Row, inputStyle } from "../ui";

/**
 * Publishes an approved summary to the shared backend, which is what makes it
 * visible in the mobile app. Publication is append-only: each press creates a new
 * immutable version and release rather than editing live content.
 */
export function PublishPanel() {
  const { projects, statementsFor, notify } = useApp();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Card style={{ padding: 16, borderColor: "var(--line)" }}>
        <Eyebrow>Shared backend</Eyebrow>
        <div style={{ fontSize: 13, marginTop: 6, color: "var(--muted)" }}>
          Not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> to <code>admin/.env.local</code>, then
          restart the dev server. Until then the mobile app reads its bundled
          prototype content.
        </div>
      </Card>
    );
  }

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy("signin");
    const { error: signInError } = await supabase!.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) setError(signInError.message);
    else setPassword("");
    setBusy(null);
  };

  const publish = async (projectId: string) => {
    setError(null);
    setBusy(projectId);
    try {
      const project = projects.find((item) => item.id === projectId)!;
      const result = await publishProject(
        project,
        statementsFor(projectId),
        session?.user.email ?? "admin",
      );
      notify(
        `Published ${project.shortTitle} v${result.versionNumber} · ${result.statementCount} statements live`,
      );
    } catch (publishError) {
      setError((publishError as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!session) {
    return (
      <Card style={{ padding: 16 }}>
        <Row gap={8}>
          <ShieldCheck size={16} color="var(--forest)" />
          <Eyebrow>Sign in to publish</Eyebrow>
        </Row>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          Publishing writes immutable versions to the shared database, so it requires
          an editorial account. Create one in the Supabase dashboard under
          Authentication → Users.
        </div>
        <form onSubmit={signIn} style={{ marginTop: 12, maxWidth: 320 }}>
          <FieldLabel>Email</FieldLabel>
          <input
            style={inputStyle}
            type="email"
            value={email}
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <div style={{ height: 10 }} />
          <FieldLabel>Password</FieldLabel>
          <input
            style={inputStyle}
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <div style={{ height: 12 }} />
          <PrimaryButton
            label={busy === "signin" ? "Signing in…" : "Sign in"}
            disabled={busy === "signin"}
          />
        </form>
        {error ? (
          <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        ) : null}
      </Card>
    );
  }

  const publishable = projects.filter(
    (project) => project.state === "Approved" || project.state === "Published",
  );

  return (
    <Card style={{ padding: 16 }}>
      <Row gap={8} style={{ justifyContent: "space-between" }}>
        <Row gap={8}>
          <CloudUpload size={16} color="var(--forest)" />
          <Eyebrow>Publish to mobile</Eyebrow>
        </Row>
        <button
          onClick={() => supabase!.auth.signOut()}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
            fontSize: 11,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <LogOut size={13} /> {session.user.email}
        </button>
      </Row>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
        Each publish creates a new immutable version and points the live release at
        it. The mobile app picks it up on next launch or pull-to-refresh.
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {publishable.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            No approved summaries yet. Move a project through review first.
          </div>
        ) : null}
        {publishable.map((project) => (
          <Row
            key={project.id}
            gap={10}
            style={{
              justifyContent: "space-between",
              borderTop: "1px solid var(--line)",
              paddingTop: 8,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{project.shortTitle}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {statementsFor(project.id).length} statements · {project.state}
              </div>
            </div>
            <PrimaryButton
              small
              label={busy === project.id ? "Publishing…" : "Publish"}
              onClick={() => publish(project.id)}
              disabled={busy === project.id}
            />
          </Row>
        ))}
      </div>

      {error ? (
        <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 10 }}>
          {error}
        </div>
      ) : null}
    </Card>
  );
}
