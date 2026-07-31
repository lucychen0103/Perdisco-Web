import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import type { StatementType } from "./types";

export const typeVisuals: Record<
  StatementType,
  { background: string; strong: string; label: string }
> = {
  FACT: { background: "var(--blue)", strong: "var(--blue-dark)", label: "FACT" },
  OPINION: {
    background: "var(--purple)",
    strong: "var(--purple-dark)",
    label: "OPINION",
  },
  FORECAST: {
    background: "var(--lime)",
    strong: "var(--lime-dark)",
    label: "FORECAST",
  },
  "MENTAL MODEL": {
    background: "var(--peach)",
    strong: "var(--peach-dark)",
    label: "MENTAL MODEL",
  },
};

const stateTones: Record<string, { bg: string; fg: string }> = {
  Draft: { bg: "var(--paper-muted)", fg: "var(--muted)" },
  Processing: { bg: "var(--blue)", fg: "var(--blue-dark)" },
  Blocked: { bg: "#F3DAD7", fg: "var(--danger)" },
  "Ready for review": { bg: "var(--purple)", fg: "var(--purple-dark)" },
  "In review": { bg: "var(--purple)", fg: "var(--purple-dark)" },
  "Changes requested": { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Approved: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  Scheduled: { bg: "var(--blue)", fg: "var(--blue-dark)" },
  Published: { bg: "var(--forest)", fg: "var(--white)" },
  Live: { bg: "var(--forest)", fg: "var(--white)" },
  Publishing: { bg: "var(--blue)", fg: "var(--blue-dark)" },
  Corrected: { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Withdrawn: { bg: "var(--paper-muted)", fg: "var(--muted)" },
  Archived: { bg: "var(--paper-muted)", fg: "var(--subtle)" },
  Failed: { bg: "#F3DAD7", fg: "var(--danger)" },
  "Rolled back": { bg: "var(--paper-muted)", fg: "var(--muted)" },
  "Not started": { bg: "var(--paper-muted)", fg: "var(--subtle)" },
  Open: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  Closing: { bg: "var(--peach)", fg: "var(--peach-dark)" },
  "Awaiting resolution": { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Disputed: { bg: "#F3DAD7", fg: "var(--danger)" },
  Resolved: { bg: "var(--forest)", fg: "var(--white)" },
  Void: { bg: "var(--paper-muted)", fg: "var(--muted)" },
  New: { bg: "#F3DAD7", fg: "var(--danger)" },
  Actioned: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  Appealed: { bg: "var(--purple)", fg: "var(--purple-dark)" },
  Closed: { bg: "var(--paper-muted)", fg: "var(--muted)" },
  Ready: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  "Needs review": { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Complete: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  Running: { bg: "var(--blue)", fg: "var(--blue-dark)" },
  Waiting: { bg: "var(--paper-muted)", fg: "var(--subtle)" },
  Cleared: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  "Pending review": { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Expiring: { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Missing: { bg: "#F3DAD7", fg: "var(--danger)" },
  Restricted: { bg: "#F3DAD7", fg: "var(--danger)" },
  Active: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  Invited: { bg: "var(--blue)", fg: "var(--blue-dark)" },
  Suspended: { bg: "#F3DAD7", fg: "var(--danger)" },
  Blocker: { bg: "#F3DAD7", fg: "var(--danger)" },
  Major: { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Minor: { bg: "var(--paper-muted)", fg: "var(--muted)" },
  High: { bg: "#F3DAD7", fg: "var(--danger)" },
  Medium: { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Low: { bg: "var(--paper-muted)", fg: "var(--muted)" },
};

export function StatusPill({ value }: { value: string }) {
  const tone = stateTones[value] ?? { bg: "var(--paper-muted)", fg: "var(--muted)" };
  return (
    <span className="pill" style={{ background: tone.bg, color: tone.fg }}>
      {value}
    </span>
  );
}

export function TypeBadge({ type }: { type: StatementType }) {
  const visual = typeVisuals[type];
  return (
    <span
      className="pill"
      style={{ background: visual.strong, color: "var(--white)", letterSpacing: "1.1px" }}
    >
      {visual.label}
    </span>
  );
}

export function Eyebrow({
  children,
  style,
}: PropsWithChildren<{ style?: CSSProperties }>) {
  return (
    <div className="eyebrow" style={style}>
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
  onAction,
  style,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        marginTop: 30,
        marginBottom: 14,
        ...style,
      }}
    >
      <div>
        <Eyebrow style={{ fontSize: 9, marginBottom: 3 }}>{eyebrow}</Eyebrow>
        <h2 className="display" style={{ fontSize: 23, lineHeight: "29px" }}>
          {title}
        </h2>
      </div>
      {action ? (
        <button
          onClick={onAction}
          style={{
            color: "var(--forest)",
            fontSize: 12,
            fontWeight: 600,
            paddingBottom: 3,
          }}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  style,
  onClick,
}: PropsWithChildren<{ style?: CSSProperties; onClick?: () => void }>) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        padding: 16,
        ...(onClick ? { cursor: "pointer" } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Avatar({
  initials,
  size = 34,
  tone = "forest",
}: {
  initials: string;
  size?: number;
  tone?: "forest" | "paper" | "lime";
}) {
  const bg =
    tone === "forest" ? "var(--forest)" : tone === "lime" ? "var(--lime)" : "var(--paper-muted)";
  const fg =
    tone === "forest" ? "var(--white)" : tone === "lime" ? "var(--forest-dark)" : "var(--muted)";
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.36,
        background: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(9, size * 0.28),
        fontWeight: 700,
        letterSpacing: 0.4,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "danger" | "warn" | "ok";
  onClick?: () => void;
}) {
  const color =
    tone === "danger"
      ? "var(--danger)"
      : tone === "warn"
        ? "var(--peach-dark)"
        : tone === "ok"
          ? "var(--forest)"
          : "var(--ink)";
  return (
    <Card
      onClick={onClick}
      style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 4 }}
    >
      <Eyebrow style={{ fontSize: 9, color: "var(--muted)" }}>{label}</Eyebrow>
      <div className="display" style={{ fontSize: 30, lineHeight: "34px", color }}>
        {value}
      </div>
      {hint ? (
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{hint}</div>
      ) : null}
    </Card>
  );
}

export function Row({
  children,
  gap = 10,
  wrap,
  align = "center",
  style,
}: PropsWithChildren<{
  gap?: number;
  wrap?: boolean;
  align?: CSSProperties["alignItems"];
  style?: CSSProperties;
}>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: align,
        gap,
        flexWrap: wrap ? "wrap" : "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <Card style={{ padding: 28, textAlign: "center" }}>
      <div className="display" style={{ fontSize: 20 }}>
        {title}
      </div>
      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>{detail}</div>
    </Card>
  );
}

export function FieldLabel({ children }: PropsWithChildren) {
  return (
    <label
      className="eyebrow"
      style={{ fontSize: 9, display: "block", marginBottom: 5, color: "var(--muted)" }}
    >
      {children}
    </label>
  );
}

export const inputStyle: CSSProperties = {
  width: "100%",
  background: "var(--paper)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "9px 11px",
  fontSize: 13,
  outline: "none",
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  lineHeight: 1.5,
  fontFamily: "var(--font-body)",
};

export function PrimaryButton({
  label,
  onClick,
  icon,
  variant = "dark",
  disabled,
  small,
}: {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  variant?: "dark" | "light" | "lime" | "danger";
  disabled?: boolean;
  small?: boolean;
}) {
  const styles: Record<string, CSSProperties> = {
    dark: { background: "var(--forest)", color: "var(--white)" },
    lime: { background: "var(--lime-dark)", color: "var(--white)" },
    danger: { background: "var(--danger)", color: "var(--white)" },
    light: {
      background: "var(--paper)",
      color: "var(--forest)",
      border: "1px solid var(--line)",
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: small ? 34 : 44,
        borderRadius: small ? 12 : 15,
        padding: small ? "0 13px" : "0 18px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: small ? 11 : 13,
        fontWeight: 600,
        opacity: disabled ? 0.38 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity 120ms ease, transform 120ms ease",
        ...styles[variant],
      }}
      onMouseDown={(event) => {
        if (!disabled) (event.currentTarget.style.transform = "scale(0.985)");
      }}
      onMouseUp={(event) => (event.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(event) => (event.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
      {label}
    </button>
  );
}

export function Modal({
  eyebrow,
  title,
  onClose,
  children,
  width = 600,
}: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  onClose: () => void;
  width?: number;
}>) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(23,33,28,0.30)",
        zIndex: 80,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px 20px 40px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="card"
        style={{
          width,
          maxWidth: "94vw",
          borderRadius: 24,
          padding: 22,
          boxShadow: "var(--shadow)",
        }}
      >
        {eyebrow ? <Eyebrow style={{ fontSize: 9 }}>{eyebrow}</Eyebrow> : null}
        <div className="display" style={{ fontSize: 22, marginTop: 3, marginBottom: 14 }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}
