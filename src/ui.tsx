import { useEffect, useRef, useState } from "react";
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
  Draft: { bg: "var(--panel-strong)", fg: "var(--muted)" },
  Processing: { bg: "var(--blue)", fg: "var(--blue-dark)" },
  Blocked: { bg: "var(--danger-fill)", fg: "var(--danger)" },
  "Ready for review": { bg: "var(--purple)", fg: "var(--purple-dark)" },
  "In review": { bg: "var(--purple)", fg: "var(--purple-dark)" },
  "Changes requested": { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Approved: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  Scheduled: { bg: "var(--blue)", fg: "var(--blue-dark)" },
  Published: { bg: "var(--forest)", fg: "var(--forest-dark)" },
  Live: { bg: "var(--forest)", fg: "var(--forest-dark)" },
  Publishing: { bg: "var(--blue)", fg: "var(--blue-dark)" },
  Corrected: { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Withdrawn: { bg: "var(--paper-muted)", fg: "var(--muted)" },
  Archived: { bg: "var(--paper-muted)", fg: "var(--subtle)" },
  Failed: { bg: "var(--danger-fill)", fg: "var(--danger)" },
  "Rolled back": { bg: "var(--paper-muted)", fg: "var(--muted)" },
  "Not started": { bg: "var(--paper-muted)", fg: "var(--subtle)" },
  Open: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  Closing: { bg: "var(--peach)", fg: "var(--peach-dark)" },
  "Awaiting resolution": { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Disputed: { bg: "var(--danger-fill)", fg: "var(--danger)" },
  Resolved: { bg: "var(--forest)", fg: "var(--forest-dark)" },
  Void: { bg: "var(--paper-muted)", fg: "var(--muted)" },
  New: { bg: "var(--danger-fill)", fg: "var(--danger)" },
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
  Missing: { bg: "var(--danger-fill)", fg: "var(--danger)" },
  Restricted: { bg: "var(--danger-fill)", fg: "var(--danger)" },
  Active: { bg: "var(--lime)", fg: "var(--lime-dark)" },
  Invited: { bg: "var(--blue)", fg: "var(--blue-dark)" },
  Suspended: { bg: "var(--danger-fill)", fg: "var(--danger)" },
  Blocker: { bg: "var(--danger-fill)", fg: "var(--danger)" },
  Major: { bg: "var(--peach)", fg: "var(--peach-dark)" },
  Minor: { bg: "var(--paper-muted)", fg: "var(--muted)" },
  High: { bg: "var(--danger-fill)", fg: "var(--danger)" },
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
  // Nocturne type row: dot in the type colour beside a tracked micro label.
  return (
    <span
      className="pill"
      style={{
        padding: "4px 2px",
        color: visual.strong,
        letterSpacing: "1.8px",
        gap: 7,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: visual.strong,
          flexShrink: 0,
        }}
      />
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
    tone === "forest"
      ? "var(--champagne)"
      : tone === "lime"
        ? "var(--champagne)"
        : "var(--panel-strong)";
  const fg =
    tone === "forest" || tone === "lime"
      ? "var(--ground-deep)"
      : "var(--ink-soft)";
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
  background: "rgba(234,246,245,0.08)",
  border: "1px solid var(--outline-dim)",
  borderRadius: 12,
  padding: "9px 11px",
  fontSize: 13,
  color: "var(--ink)",
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
    dark: { background: "var(--magenta)", color: "var(--magenta-on)" },
    lime: { background: "var(--champagne)", color: "var(--ground-deep)" },
    danger: {
      background: "var(--danger-fill)",
      color: "var(--rose-light)",
      border: "1px solid var(--rose)",
    },
    light: {
      background: "transparent",
      color: "var(--ink)",
      border: "1px solid var(--outline)",
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: small ? 34 : 44,
        borderRadius: small ? 12 : 14,
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

export type SplitButtonItem = {
  label: string;
  detail?: string;
  onClick: () => void;
  disabled?: boolean;
};

/**
 * A primary action with secondary actions folded into a menu — used where one
 * control advances a project down several mutually exclusive paths (publish now,
 * schedule, park as draft) and only one of them should read as the default.
 */
export function SplitButton({
  label,
  onClick,
  items,
  icon,
  variant = "dark",
  disabled,
}: {
  label: string;
  onClick?: () => void;
  items: SplitButtonItem[];
  icon?: ReactNode;
  variant?: "dark" | "light" | "lime" | "danger";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const styles: Record<string, CSSProperties> = {
    dark: { background: "var(--magenta)", color: "var(--magenta-on)" },
    lime: { background: "var(--champagne)", color: "var(--ground-deep)" },
    danger: {
      background: "var(--danger-fill)",
      color: "var(--rose-light)",
      border: "1px solid var(--rose)",
    },
    light: {
      background: "transparent",
      color: "var(--ink)",
      border: "1px solid var(--outline)",
    },
  };
  const tone = styles[variant];
  const divider =
    variant === "light"
      ? "var(--outline-dim)"
      : variant === "lime"
        ? "rgba(6, 35, 43, 0.24)"
        : "rgba(255, 255, 255, 0.24)";

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "stretch",
          borderRadius: 15,
          overflow: "hidden",
          opacity: disabled ? 0.38 : 1,
          ...tone,
        }}
      >
        <button
          onClick={onClick}
          disabled={disabled}
          style={{
            minHeight: 44,
            padding: "0 16px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "inherit",
            background: "none",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {icon}
          {label}
        </button>
        <span style={{ width: 1, background: divider, flexShrink: 0 }} />
        <button
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="More publish actions"
          style={{
            minHeight: 44,
            padding: "0 11px",
            display: "inline-flex",
            alignItems: "center",
            color: "inherit",
            background: "none",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          <ChevronDownGlyph open={open} />
        </button>
      </div>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 40,
            minWidth: 244,
            background: "var(--paper)",
            border: "1px solid var(--hairline)",
            borderRadius: 14,
            boxShadow: "0 12px 30px rgba(2, 20, 25, 0.45)",
            padding: 5,
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 10px",
                borderRadius: 10,
                background: "none",
                border: "none",
                cursor: item.disabled ? "not-allowed" : "pointer",
                opacity: item.disabled ? 0.4 : 1,
              }}
              onMouseEnter={(event) => {
                if (!item.disabled)
                  event.currentTarget.style.background = "var(--paper-muted)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "none";
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--champagne)" }}>
                {item.label}
              </div>
              {item.detail ? (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {item.detail}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChevronDownGlyph({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform 120ms ease",
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
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
        background: "rgba(2, 20, 25, 0.6)",
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
          background: "var(--paper)",
          boxShadow: "0 20px 50px rgba(2, 20, 25, 0.5)",
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
