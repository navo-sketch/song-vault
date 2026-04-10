// FlowLab.jsx
// Independent beat-analysis + flow-pattern tool.
// Only connects to LyricLab in ONE direction: creating a NEW project via onCreateProject callback.
// Never reads or edits existing songs/projects. Never calls the lyric generator.

import { useState, useRef } from "react";

const T = {
  bg: "#0F0F11", card: "#1C1C1E", cardAlt: "#2C2C2E",
  border: "#3A3A3C", text: "#F2F2F7", textSub: "#EBEBF5CC",
  textMuted: "#98989D", textFaint: "#48484A",
  accent: "#0A84FF", green: "#30D158", orange: "#FF9F0A", purple: "#BF5AF2",
};

// ── Flow pattern library ───────────────────────────────────────────────────
// syllableMap: 16 slots per bar (each = one 16th note)
// 1 = syllable hit, 0 = rest
const PATTERNS = {
  simple_quarter: {
    name: "Quarter Notes",
    desc: "Land on every beat (1 2 3 4) — classic steady flow",
    syllableMap: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    example: "DA · · · DA · · · DA · · · DA · · ·",
    complexity: 1,
  },
  simple_eighth: {
    name: "Eighth Notes",
    desc: "Two syllables per beat — smooth, even delivery",
    syllableMap: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    example: "DA · DA · DA · DA · DA · DA · DA · DA ·",
    complexity: 1,
  },
  offbeat: {
    name: "Off-Beat",
    desc: "Lands between the beats — creates a laid-back, behind-the-bar feel",
    syllableMap: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    example: "· · DA · · · DA · · · DA · · · DA ·",
    complexity: 2,
  },
  triplets: {
    name: "Triplet Flow",
    desc: "Three syllables per beat — bouncy, hip-hop classic",
    syllableMap: [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
    example: "da-da-DA · da-da-DA · da-da-DA · da-da-DA ·",
    complexity: 2,
  },
  syncopated: {
    name: "Syncopated",
    desc: "Hit the + counts between beats — punchy and rhythmically interesting",
    syllableMap: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    example: "DA · · da · DA · · DA · · da · DA · ·",
    complexity: 3,
  },
  mixed_a: {
    name: "Front-Loaded",
    desc: "Dense delivery at the start of the bar, relaxed finish — builds tension",
    syllableMap: [1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    example: "da-da-DA · da · DA · DA · · · DA · · ·",
    complexity: 3,
  },
  mixed_b: {
    name: "Strong 1&3 Burst",
    desc: "Anchor on beats 1 and 3, triplet burst on 2 and 4",
    syllableMap: [1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0],
    example: "DA · · · da-da-DA · DA · · · da-da-DA ·",
    complexity: 4,
  },
  double_time: {
    name: "Double Time",
    desc: "16 syllables per bar — maximum speed, every 16th note filled",
    syllableMap: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    example: "da-da-da-da · da-da-da-da · da-da-da-da · da-da-da-da",
    complexity: 5,
  },
};

const ACCENT_COLORS = [T.accent, T.orange, T.purple, T.green];

// Returns patterns sorted by complexity, filtered to ≤ requested level
function selectPatterns(complexityLevel, count) {
  const pool = Object.entries(PATTERNS)
    .filter(([, p]) => p.complexity <= complexityLevel)
    .sort(() => Math.random() - 0.5);
  return pool.slice(0, count).map(([key]) => key);
}

// ── BPM detection ──────────────────────────────────────────────────────────
async function detectBPM(arrayBuffer) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  const ctx = new AudioCtx();
  let buffer;
  try {
    buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    ctx.close();
    return null;
  }
  ctx.close();

  const channel = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const winSize = Math.round(sr * 0.025); // 25 ms window
  const hop    = Math.round(winSize / 2);

  // Energy envelope
  const energies = [];
  for (let i = 0; i + winSize < channel.length; i += hop) {
    let sum = 0;
    for (let j = i; j < i + winSize; j++) sum += channel[j] ** 2;
    energies.push(Math.sqrt(sum / winSize));
  }

  // Peak picking against local mean
  const localR = 20;
  const peaks = [];
  for (let i = localR; i < energies.length - localR; i++) {
    let avg = 0;
    for (let j = i - localR; j <= i + localR; j++) avg += energies[j];
    avg /= (2 * localR + 1);
    const isLocalMax = energies[i] > energies[i - 1] && energies[i] > energies[i + 1];
    if (isLocalMax && energies[i] > avg * 1.5) {
      const minGapSamples = Math.round(0.2 * sr / hop);
      if (peaks.length === 0 || i - peaks[peaks.length - 1] > minGapSamples) {
        peaks.push(i);
      }
    }
  }

  if (peaks.length < 4) return null;

  const intervals = [];
  for (let i = 1; i < peaks.length; i++) intervals.push((peaks[i] - peaks[i - 1]) * hop / sr);
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let bpm = Math.round(60 / median);
  while (bpm < 60) bpm *= 2;
  while (bpm > 200) bpm /= 2;
  return Math.max(60, Math.min(200, bpm));
}

// ── Bar grid ───────────────────────────────────────────────────────────────
function BarGrid({ patternKey, bpm, barCount }) {
  const { syllableMap } = PATTERNS[patternKey] ?? PATTERNS.simple_quarter;
  const barMs = ((60 / bpm) * 4 * 1000).toFixed(0);

  return (
    <div>
      {Array.from({ length: barCount }, (_, bi) => (
        <div key={bi} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: T.textFaint, fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>
            BAR {bi + 1}  ·  {barMs} ms
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
            {syllableMap.map((hit, si) => {
              const isDownbeat = si % 4 === 0;
              const beatNum = Math.floor(si / 4) + 1;
              return (
                <div key={si} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: isDownbeat ? 13 : 9,
                    height: isDownbeat ? 13 : 9,
                    borderRadius: "50%",
                    background: hit
                      ? (isDownbeat ? T.accent : T.orange)
                      : (isDownbeat ? "#2C2C2E" : T.border),
                    border: isDownbeat ? `1px solid ${hit ? T.accent : "#3A3A3C"}` : "none",
                    transition: "background 0.15s",
                  }} />
                  {isDownbeat && (
                    <div style={{ fontSize: 8, color: T.textFaint, fontWeight: 700 }}>{beatNum}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FlowLab component ──────────────────────────────────────────────────────
export default function FlowLab({ onCreateProject }) {
  const [fileName, setFileName]   = useState(null);
  const [bpm, setBpm]             = useState(null);
  const [manualBpm, setManualBpm] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [detectErr, setDetectErr] = useState(null);
  const [complexity, setComplexity] = useState(2);
  const [barCount, setBarCount]   = useState(4);
  const [patterns, setPatterns]   = useState([]);
  const [generated, setGenerated] = useState(false);
  const fileRef = useRef();

  const bpmLabel = !bpm ? "" :
    bpm < 70 ? "Slow Ballad" : bpm < 90 ? "Slow Groove" :
    bpm < 100 ? "Mid Tempo" : bpm < 115 ? "Moderate" :
    bpm < 130 ? "Upbeat" : bpm < 150 ? "Fast" : "Very Fast";

  const complexityLabel = ["", "Simple", "Simple+", "Moderate", "Complex", "Maximum"][complexity];

  async function handleFile(file) {
    if (!file) return;
    const ok = file.type?.startsWith("audio/") || /\.(mp3|wav)$/i.test(file.name);
    if (!ok) { setDetectErr("Upload an MP3 or WAV file."); return; }
    setFileName(file.name);
    setBpm(null); setDetecting(true); setDetectErr(null);
    setGenerated(false); setPatterns([]);
    try {
      const buf = await file.arrayBuffer();
      const detected = await detectBPM(buf);
      if (detected) { setBpm(detected); }
      else { setDetectErr("BPM not detected — set it manually below."); setBpm(120); }
    } catch { setDetectErr("Audio analysis failed. Try another file."); }
    setDetecting(false);
  }

  function applyManualBpm() {
    const n = parseInt(manualBpm, 10);
    if (n >= 40 && n <= 250) { setBpm(n); setManualBpm(""); setDetectErr(null); }
  }

  function generate() {
    const count = complexity <= 2 ? 2 : complexity <= 3 ? 3 : 4;
    setPatterns(selectPatterns(complexity, count));
    setGenerated(true);
  }

  function handleExport() {
    if (!onCreateProject || !bpm) return;
    const patternDetails = patterns.map((key, i) => {
      const p = PATTERNS[key];
      return `Pattern ${i + 1} — ${p.name}\nStyle: ${p.desc}\nGrid:  ${p.example}`;
    }).join("\n\n");
    const notes = [
      "=== Flow Lab Export ===",
      `BPM: ${bpm}  (${bpmLabel})`,
      `Bars: ${barCount}`,
      `Complexity: ${complexityLabel}`,
      "",
      "=== Flow Patterns ===",
      patternDetails,
      "",
      "=== How to use ===",
      "• Use the bar grids as a rhythmic blueprint while writing.",
      "• Each filled dot = one syllable hit.",
      "• Blue dots = downbeats (1 2 3 4), orange = subdivision hits.",
    ].join("\n");

    onCreateProject({
      title: `Flow ${bpm} BPM`,
      bpm,
      patterns: patterns.map(k => ({ key: k, ...PATTERNS[k] })),
      barCount,
      notes,
    });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, color: T.text }}>Flow Lab</div>
        <div style={{ fontSize: 14, color: T.textMuted, marginTop: 4, lineHeight: 1.55 }}>
          Upload a beat, detect BPM, and generate rap flow patterns.
          Rhythm only — no lyrics.
        </div>
      </div>

      {/* ── Upload ── */}
      <div style={{ background: T.card, borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>
          Beat Upload
        </div>
        <input ref={fileRef} type="file" accept=".mp3,.wav,audio/*" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files?.[0])} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={detecting}
          style={{
            width: "100%", padding: "22px 16px", borderRadius: 12,
            border: `2px dashed ${fileName ? T.accent : T.border}`,
            background: fileName ? T.accent + "0C" : "transparent",
            cursor: detecting ? "default" : "pointer",
            color: fileName ? T.accent : T.textMuted, fontSize: 15, fontWeight: 500,
            transition: "all 0.2s",
          }}
        >
          {detecting
            ? "⏳  Analyzing beat…"
            : fileName
              ? `✓  ${fileName}`
              : "⬆  Upload Beat (MP3 or WAV)"}
        </button>
        {detectErr && (
          <div style={{ fontSize: 13, color: T.orange, marginTop: 10, lineHeight: 1.5 }}>{detectErr}</div>
        )}
      </div>

      {/* ── BPM display + manual override ── */}
      {bpm !== null && (
        <div style={{ background: T.card, borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>BPM</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 60, fontWeight: 800, color: T.accent, letterSpacing: -3, lineHeight: 1 }}>{bpm}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{bpmLabel}</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{(60000 / bpm).toFixed(1)} ms / beat</div>
            </div>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}>
              <button onClick={() => setBpm(b => Math.max(40, b - 1))}
                style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.text, fontSize: 20, fontWeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <button onClick={() => setBpm(b => Math.min(250, b + 1))}
                style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.text, fontSize: 20, fontWeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
          {/* Manual BPM entry */}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input
              type="number" min="40" max="250"
              placeholder="Enter BPM manually"
              value={manualBpm}
              onChange={e => setManualBpm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyManualBpm()}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 9,
                border: `1px solid ${T.border}`, fontSize: 14,
                background: T.cardAlt, color: T.text,
              }}
            />
            <button onClick={applyManualBpm}
              style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", fontSize: 14, fontWeight: 600 }}>
              Set
            </button>
          </div>
        </div>
      )}

      {/* ── Controls (only after BPM available) ── */}
      {bpm !== null && (
        <div style={{ background: T.card, borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 18 }}>Generator Settings</div>

          {/* Complexity slider */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>Complexity</span>
              <span style={{ fontSize: 14, color: T.accent, fontWeight: 700 }}>{complexityLabel}</span>
            </div>
            <input type="range" min="1" max="5" value={complexity}
              onChange={e => setComplexity(Number(e.target.value))}
              style={{ width: "100%", accentColor: T.accent, cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
              <span style={{ fontSize: 11, color: T.textFaint }}>Simple</span>
              <span style={{ fontSize: 11, color: T.textFaint }}>Maximum</span>
            </div>
          </div>

          {/* Bar count */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: T.text, fontWeight: 500, marginBottom: 10 }}>Bar Sections</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[4, 8].map(n => (
                <button key={n} onClick={() => setBarCount(n)}
                  style={{
                    flex: 1, padding: "9px", borderRadius: 9, border: "none", fontSize: 14, fontWeight: 500,
                    background: barCount === n ? T.accent : T.cardAlt,
                    color: barCount === n ? "#fff" : T.textMuted,
                    transition: "all 0.15s",
                  }}>
                  {n} bars
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate}
            style={{
              width: "100%", padding: "13px", borderRadius: 11, border: "none",
              background: T.green, color: "#fff", fontSize: 15, fontWeight: 700,
              letterSpacing: 0.3, cursor: "pointer",
              boxShadow: "0 3px 14px rgba(48,209,88,0.3)",
            }}>
            {generated ? "⟳  Regenerate Flow Patterns" : "⚡  Generate Flow Patterns"}
          </button>
        </div>
      )}

      {/* ── Flow Results ── */}
      {generated && patterns.length > 0 && (
        <div style={{ background: T.card, borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 18 }}>Flow Patterns</div>

          {patterns.map((key, idx) => {
            const p = PATTERNS[key];
            const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
            return (
              <div key={key + idx} style={{
                background: T.cardAlt, borderRadius: 12, padding: 16,
                marginBottom: 14, border: `1px solid ${T.border}`,
              }}>
                {/* Pattern header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: color + "28", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800, color,
                  }}>{idx + 1}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>{p.desc}</div>
                  </div>
                </div>

                {/* Timing example */}
                <div style={{
                  fontFamily: "monospace", fontSize: 11, color: T.accent,
                  background: T.accent + "0F", borderRadius: 7,
                  padding: "8px 10px", marginBottom: 12,
                  letterSpacing: 0.4, lineHeight: 1.5, wordBreak: "break-all",
                }}>
                  {p.example}
                </div>

                {/* Bar grid */}
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textFaint, marginBottom: 10, letterSpacing: 0.5 }}>
                  BAR GRID  ·  <span style={{ color: T.accent }}>●</span> downbeat hit  <span style={{ color: T.orange }}>●</span> subdivision hit  <span style={{ color: T.border }}>○</span> rest
                </div>
                <BarGrid patternKey={key} bpm={bpm} barCount={barCount} />
              </div>
            );
          })}

          {/* Export button */}
          <button onClick={handleExport}
            style={{
              width: "100%", marginTop: 6, padding: "14px", borderRadius: 12, border: "none",
              background: `linear-gradient(135deg, ${T.accent} 0%, ${T.purple} 100%)`,
              color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: 0.3,
              boxShadow: "0 4px 20px rgba(10,132,255,0.35)", cursor: "pointer",
            }}>
            🎼  Create New Project from Flow
          </button>
          <div style={{ fontSize: 12, color: T.textFaint, textAlign: "center", marginTop: 8 }}>
            Creates a new LyricLab project pre-loaded with BPM &amp; flow patterns
          </div>
        </div>
      )}

      {/* Empty state */}
      {!fileName && !detecting && (
        <div style={{ textAlign: "center", padding: "40px 0 20px", color: T.textMuted }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎛️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.textSub, marginBottom: 6 }}>Upload a beat to start</div>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>
            Flow Lab detects BPM and builds<br />
            rhythmic flow blueprints for your delivery.
          </div>
        </div>
      )}
    </div>
  );
}
