import {
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { assets } from "../data";
import { useApp } from "../state";
import { Card, Eyebrow, Row, StatusPill } from "../ui";

const KINDS = [
  "All",
  "Audio",
  "Video",
  "Transcript",
  "Document",
  "Image",
  "Captions",
  "Rights evidence",
] as const;

const iconFor = (kind: string) => {
  switch (kind) {
    case "Audio":
      return FileAudio;
    case "Video":
      return FileVideo;
    case "Transcript":
      return ScrollText;
    case "Image":
      return FileImage;
    case "Rights evidence":
      return ShieldCheck;
    default:
      return FileText;
  }
};

export function AssetsPage() {
  const { projects, navigate } = useApp();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("All");

  const filtered = useMemo(
    () => assets.filter((asset) => kind === "All" || asset.kind === kind),
    [kind],
  );

  return (
    <div style={{ maxWidth: 940 }}>
      <Eyebrow>Assets</Eyebrow>
      <h1 className="display" style={{ fontSize: 34, lineHeight: "39px", marginTop: 4 }}>
        Media, transcripts & rights
      </h1>
      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
        Every asset keeps its provenance: import identity, processing run, and the rights
        record that governs how it may appear to consumers.
      </div>

      <Row gap={6} wrap style={{ marginTop: 18 }}>
        {KINDS.map((item) => (
          <button
            key={item}
            onClick={() => setKind(item)}
            className="pill"
            style={{
              padding: "8px 13px",
              fontSize: 10,
              background: kind === item ? "var(--forest)" : "var(--paper)",
              color: kind === item ? "var(--white)" : "var(--muted)",
              border: "1px solid var(--line)",
            }}
          >
            {item}
          </button>
        ))}
      </Row>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((asset) => {
          const project = projects.find((item) => item.id === asset.projectId);
          const Icon = iconFor(asset.kind);
          return (
            <Card
              key={asset.id}
              style={{ display: "flex", alignItems: "center", gap: 13, padding: 13 }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  background: "var(--paper-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color="var(--forest)" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                  {asset.name}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
                  {asset.kind} ·{" "}
                  {project ? (
                    <button
                      onClick={() => navigate(`project/${project.id}`)}
                      style={{ color: "var(--forest)", fontWeight: 600 }}
                    >
                      {project.shortTitle}
                    </button>
                  ) : (
                    "—"
                  )}{" "}
                  · {asset.meta} · updated {asset.updatedAt}
                </div>
              </div>
              <StatusPill value={asset.status} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
