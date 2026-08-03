import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useApp } from "../state";
import { Eyebrow, FieldLabel, PrimaryButton, Row, inputStyle } from "../ui";

/**
 * Blocks the workspace until drafts can actually come from the database.
 * Shown whenever Supabase is configured but the workspace is not 'ready':
 * the database is the source of truth for drafts, so there is nothing
 * meaningful to show (or safely edit) before sign-in and hydration.
 */
export function WorkspaceGate() {
  const { workspaceStatus, workspaceError } = useApp();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{ width: 400, borderRadius: 24, padding: 28, boxShadow: "var(--shadow)" }}
      >
        <Eyebrow style={{ fontSize: 9 }}>Internal · Editorial OS</Eyebrow>
        <div className="display" style={{ fontSize: 27, lineHeight: "31px", marginBottom: 4 }}>
          Perdisco
          <span style={{ color: "var(--forest)", fontSize: 13, marginLeft: 7, letterSpacing: 2 }}>
            ADMIN
          </span>
        </div>

        {workspaceStatus === "signed-out" ? (
          <SignInForm />
        ) : workspaceStatus === "error" ? (
          <>
            <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>
              Could not load the editorial workspace: {workspaceError}
            </div>
            <div style={{ marginTop: 14 }}>
              <PrimaryButton label="Retry" onClick={() => window.location.reload()} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
            {workspaceStatus === "loading"
              ? "Loading the editorial workspace…"
              : "Connecting…"}
          </div>
        )}
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signInError } = await supabase!.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) setError(signInError.message);
    else setPassword("");
    setBusy(false);
  };

  return (
    <>
      <Row gap={8} style={{ marginTop: 10 }}>
        <ShieldCheck size={15} color="var(--forest)" />
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Drafts live in the shared database. Sign in with your editorial account
          to load and edit them.
        </div>
      </Row>
      <form onSubmit={signIn} style={{ marginTop: 16 }}>
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
        <div style={{ height: 14 }} />
        <PrimaryButton label={busy ? "Signing in…" : "Sign in"} disabled={busy} />
      </form>
      {error ? (
        <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 10 }}>{error}</div>
      ) : null}
    </>
  );
}
