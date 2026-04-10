import { useState } from "react";

const T = {
  card: "#1C1C1E", cardAlt: "#2C2C2E", input: "#2C2C2E",
  border: "#3A3A3C", text: "#F2F2F7", textMuted: "#98989D",
  accent: "#0A84FF", danger: "#FF453A", orange: "#FF9F0A",
};

export default function WritersBlockBreaker({ songs, onInsertIntoSong }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [genre, setGenre] = useState("");
  const [theme, setTheme] = useState("");
  const [count, setCount] = useState("4");
  const [result, setResult] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const selectedSong = songs.find(s => s.id === selectedSongId);
  const currentLyrics = selectedSong?.lyrics || "";

  async function generate() {
    if (!selectedSongId) {
      setError("Select a song first");
      return;
    }
    setGenerating(true);
    setError(null);
    setResult("");

    const genreText = genre.trim() || "general";
    const themeText = theme.trim() || "personal experience";
    const currentContext = currentLyrics ? `Current lyrics:\n${currentLyrics}\n\n` : "";
    const prompt = `${currentContext}Continue or build on this song with ${count} more lines. Genre: ${genreText}. Theme: ${themeText}. Keep the same style and energy. Output only the new lyrics, no intro or explanation. Each line on its own line.`;

    try {
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { method: "GET" });
      const text = await res.text();
      setResult(text.trim());
    } catch {
      setError("Generation failed. Check your connection and try again.");
    }
    setGenerating(false);
  }

  function insertResult() {
    if (result && onInsertIntoSong) {
      onInsertIntoSong(selectedSongId, result);
      setResult("");
      setGenre("");
      setTheme("");
    }
  }

  return (
    <div style={{
      background: T.card, borderRadius: 16, padding: "20px 24px", marginBottom: 20,
      border: `2px solid ${T.orange}`, boxShadow: "0 2px 12px rgba(255, 159, 10, 0.15)"
    }}>
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", padding: 0,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Writers Block Breaker</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.orange, textTransform: "uppercase", letterSpacing: 0.5 }}>AI</span>
        </div>
        <span style={{ fontSize: 13, color: T.textMuted }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Select a song to continue writing
          </div>

          <select
            value={selectedSongId}
            onChange={e => setSelectedSongId(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 9,
              border: `1px solid ${T.border}`, fontSize: 14,
              background: T.input, color: T.text, marginBottom: 12
            }}
          >
            <option value="">Choose a song…</option>
            {songs.map(song => (
              <option key={song.id} value={song.id}>
                {song.title || "Untitled"} {song.lyrics ? "✓" : ""}
              </option>
            ))}
          </select>

          {currentLyrics && (
            <div style={{
              background: T.cardAlt, borderRadius: 9, padding: "10px 12px",
              border: `1px solid ${T.border}`, marginBottom: 12
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 6 }}>Current lyrics:</div>
              <pre style={{
                fontSize: 12, color: T.text, lineHeight: 1.5,
                whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit", maxHeight: 80, overflow: "auto"
              }}>
                {currentLyrics}
              </pre>
            </div>
          )}

          <input
            placeholder="Genre (e.g. hip-hop, pop)"
            value={genre}
            onChange={e => setGenre(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 9,
              border: `1px solid ${T.border}`, fontSize: 14,
              background: T.input, color: T.text, marginBottom: 8
            }}
          />

          <input
            placeholder="Vibe / mood"
            value={theme}
            onChange={e => setTheme(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 9,
              border: `1px solid ${T.border}`, fontSize: 14,
              background: T.input, color: T.text, marginBottom: 12
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: T.textMuted, flexShrink: 0 }}>Lines:</span>
            {["4", "8", "16"].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  padding: "6px 12px", borderRadius: 8, border: "none", fontSize: 12,
                  cursor: "pointer",
                  background: count === n ? T.accent : T.cardAlt,
                  color: count === n ? "#fff" : T.textMuted
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={generate}
            disabled={generating || !selectedSongId}
            style={{
              width: "100%", padding: "10px", borderRadius: 9, border: "none",
              background: T.orange, color: "#fff", fontSize: 14, fontWeight: 600,
              opacity: (generating || !selectedSongId) ? 0.6 : 1,
              cursor: (generating || !selectedSongId) ? "not-allowed" : "pointer"
            }}
          >
            {generating ? "Generating…" : "⚡ Break through the block"}
          </button>

          {error && (
            <div style={{ fontSize: 13, color: T.danger, marginTop: 8 }}>{error}</div>
          )}

          {result && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                background: T.cardAlt, borderRadius: 9, padding: "12px 14px",
                border: `1px solid ${T.border}`
              }}>
                <pre style={{
                  fontSize: 13, color: T.text, lineHeight: 1.8,
                  whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit"
                }}>
                  {result}
                </pre>
              </div>
              <button
                onClick={insertResult}
                style={{
                  marginTop: 10, width: "100%", padding: "9px", borderRadius: 9,
                  border: "none", background: T.orange, color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                }}
                onMouseEnter={e => e.target.style.opacity = "0.88"}
                onMouseLeave={e => e.target.style.opacity = "1"}
              >
                Add to song
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
