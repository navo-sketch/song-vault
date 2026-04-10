import { useState } from "react";

const T = {
  card: "#1C1C1E", cardAlt: "#2C2C2E", input: "#2C2C2E",
  border: "#3A3A3C", text: "#F2F2F7", textMuted: "#98989D",
  accent: "#0A84FF", danger: "#FF453A",
};

const cardStyle = { background: T.card, borderRadius: 14, padding: "14px 16px", marginBottom: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" };
const sectionLabel = { fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 10 };

export default function AISongStarter({ song, onInsertLyrics }) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiType, setAiType] = useState("lyrics");
  const [aiGenre, setAiGenre] = useState("");
  const [aiTheme, setAiTheme] = useState("");
  const [aiCount, setAiCount] = useState("4");
  const [aiResult, setAiResult] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);

  async function generateStarter() {
    setAiGenerating(true);
    setAiError(null);
    setAiResult("");
    const genre = aiGenre.trim() || "general";
    const theme = aiTheme.trim() || "personal experience";
    let prompt;
    if (aiType === "endwords") {
      prompt = `Generate ${aiCount} sets of rhyming ending words for rap bars. Genre: ${genre}. Theme: ${theme}. Format: each line should be a single rhyming word only — no full sentences, no explanations. Group into rhyme pairs or sets of 4. Output only the words, one per line.`;
    } else {
      prompt = `Write ${aiCount} lines of song lyrics for a ${genre} song. Theme: ${theme}. Output only the lyrics, no intro or explanation. Each line on its own line.`;
    }
    try {
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { method: "GET" });
      const text = await res.text();
      setAiResult(text.trim());
    } catch {
      setAiError("Generation failed. Check your connection and try again.");
    }
    setAiGenerating(false);
  }

  function insertResult() {
    if (aiResult && onInsertLyrics) {
      onInsertLyrics((song.lyrics ? song.lyrics + "\n\n" : "") + aiResult);
    }
  }

  return (
    <div style={cardStyle}>
      <button
        onClick={() => setAiOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", padding: 0,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>✨</span>
          <span style={{ ...sectionLabel, marginBottom: 0 }}>AI Song Starter</span>
        </div>
        <span style={{ fontSize: 13, color: T.textMuted }}>{aiOpen ? "▲" : "▼"}</span>
      </button>

      {aiOpen && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["lyrics", "endwords"].map(t => (
              <button
                key={t}
                onClick={() => setAiType(t)}
                style={{
                  flex: 1, padding: "8px", borderRadius: 9, border: "none", fontSize: 14,
                  fontWeight: 500, cursor: "pointer",
                  background: aiType === t ? T.accent : T.cardAlt,
                  color: aiType === t ? "#fff" : T.textMuted
                }}
              >
                {t === "endwords" ? "🎤 Ending Words" : "🎵 Lyrics"}
              </button>
            ))}
          </div>

          <input
            placeholder="Genre (e.g. hip-hop, pop, R&B)"
            value={aiGenre}
            onChange={e => setAiGenre(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 9,
              border: `1px solid ${T.border}`, fontSize: 14,
              background: T.input, color: T.text, marginBottom: 8
            }}
          />
          <input
            placeholder="Theme / topic (e.g. late nights, heartbreak)"
            value={aiTheme}
            onChange={e => setAiTheme(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 9,
              border: `1px solid ${T.border}`, fontSize: 14,
              background: T.input, color: T.text, marginBottom: 8
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: T.textMuted, flexShrink: 0 }}>Lines:</span>
            {["4", "8", "16"].map(n => (
              <button
                key={n}
                onClick={() => setAiCount(n)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 13,
                  cursor: "pointer",
                  background: aiCount === n ? T.accent : T.cardAlt,
                  color: aiCount === n ? "#fff" : T.textMuted
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={generateStarter}
            disabled={aiGenerating}
            style={{
              width: "100%", padding: "10px", borderRadius: 9, border: "none",
              background: T.accent, color: "#fff", fontSize: 15, fontWeight: 600,
              opacity: aiGenerating ? 0.6 : 1,
              cursor: aiGenerating ? "not-allowed" : "pointer"
            }}
          >
            {aiGenerating ? "Generating…" : "✨ Generate"}
          </button>

          {aiError && (
            <div style={{ fontSize: 13, color: T.danger, marginTop: 8 }}>{aiError}</div>
          )}

          {aiResult && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                background: T.cardAlt, borderRadius: 9, padding: "12px 14px",
                border: `1px solid ${T.border}`
              }}>
                <pre style={{
                  fontSize: 14, color: T.text, lineHeight: 1.8,
                  whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit"
                }}>
                  {aiResult}
                </pre>
              </div>
              <button
                onClick={insertResult}
                style={{
                  marginTop: 10, width: "100%", padding: "9px", borderRadius: 9,
                  border: `1px solid ${T.border}`, background: T.cardAlt, color: T.accent,
                  fontSize: 14, fontWeight: 600, cursor: "pointer"
                }}
              >
                Insert into Lyrics
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
