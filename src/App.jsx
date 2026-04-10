// ============================================================
// LyricLab — full rewrite
// CHANGES vs previous version:
//   FIX 1: delete buttons use e.stopPropagation() to prevent row clicks
//   FIX 2: activeSongId / activeFolderId cleared immediately on delete
//   FIX 3: activeSong / activeFolder guarded everywhere with null checks
//   FIX 4: all create/edit/link/file functionality preserved
//   NEW A: top-level nav tabs: Songs | Projects | More
//   NEW B: Songs tab shows all songs across folders in a scrollable list
//          with inline title editing and inline status toggle
//   NEW C: unassigned songs (no folderId) shown in "Unassigned" section
//   NEW D: audio player rendered per-song when an audio file is attached
//   STYLE: dark mode + Inter font
// ============================================================

import { useState, useRef, useEffect } from "react";
import { getStoredSession, apiLogout, apiGetData, apiSaveData, apiSearchUsers, apiSoundCloudSendCode, apiSoundCloudVerifyCode } from "./api";
import AuthScreen from "./AuthScreen";
import LandingPage from "./LandingPage";
import AISongStarter from "./AISongStarter";
import WritersBlockBreaker from "./WritersBlockBreaker";
import MusicNoteKeyhole from "./Logo";
import FlowLab from "./FlowLab";

// ---------- global audio player (lock screen) ----------
const globalAudioElement = new Audio();
globalAudioElement.crossOrigin = "anonymous";

async function getYouTubeAudioUrl(videoId) {
  try {
    const res = await fetch(`https://api.cobalt.tools/api/json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        audioFormat: "best"
      })
    });
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

const COLORS = ["#0A84FF", "#30D158", "#FF9F0A", "#FF375F", "#BF5AF2", "#FF453A", "#64D2FF", "#FFD60A"];
const STORAGE_KEY = "lyriclab-v1";

function genId() { return Math.random().toString(36).slice(2, 9); }

// ---------- persistence via Cloudflare Worker API ----------

// ---------- dark theme palette ----------
const T = {
  bg:          "#0F0F11",
  card:        "#1C1C1E",
  cardAlt:     "#2C2C2E",
  input:       "#2C2C2E",
  border:      "#3A3A3C",
  borderFocus: "#0A84FF",
  text:        "#F2F2F7",
  textSub:     "#EBEBF5CC",
  textMuted:   "#98989D",
  textFaint:   "#48484A",
  divider:     "#2C2C2E",
  accent:      "#0A84FF",
  danger:      "#FF453A",
  shadow:      "0 1px 6px rgba(0,0,0,0.5)",
};

// ---------- shared style constants ----------
const cardStyle = { background: T.card, borderRadius: 14, padding: "14px 16px", marginBottom: 12, boxShadow: T.shadow };
const sectionLabel = { fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 10 };
const Divider = () => <div style={{ height: 1, background: T.divider, margin: "10px 0" }} />;

const STATUS = {
  idea: { label: "Idea",        color: "#98989D" },
  wip:  { label: "In Progress", color: "#FF9F0A" },
  done: { label: "Done",        color: "#30D158" },
};

// ---------- inline editable text ----------
function EditableText({ value, onSave, style, placeholder, multiline, rows = 3 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = useRef();
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  function commit() { onSave(draft); setEditing(false); }
  if (editing) {
    const shared = {
      ref,
      value: draft,
      onChange: e => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: e => {
        if (!multiline && e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      },
      style: { ...style, border: `1px solid ${T.borderFocus}`, borderRadius: 8, padding: "6px 10px", outline: "none", background: T.input, color: T.text, width: "100%", resize: multiline ? "vertical" : "none" }
    };
    return multiline ? <textarea {...shared} rows={rows} /> : <input {...shared} />;
  }
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, width: "100%" }}>
      <span style={{ ...style, flex: 1, color: value ? T.text : T.textFaint }}>{value || placeholder}</span>
      <button onClick={() => { setDraft(value); setEditing(true); }}
        style={{ background: "none", border: "none", color: T.accent, fontSize: 13, padding: "0 2px", flexShrink: 0, cursor: "pointer", opacity: 0.8 }}>Edit</button>
    </div>
  );
}

// ---------- audio player ----------
function AudioPlayer({ file }) {
  if (!file || !file.type?.startsWith("audio/")) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <audio controls src={file.dataUrl} style={{ width: "100%", height: 36 }} />
    </div>
  );
}

// ---------- link embed helpers ----------
function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function getLinkEmbed(url) {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1`;
  return null;
}

function LinkPlayer({ url }) {
  const ytId = getYouTubeId(url);
  if (!ytId) return null;
  const youtubeUrl = `https://www.youtube.com/watch?v=${ytId}`;
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", marginTop: 8, background: T.cardAlt, padding: "14px", border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => window.open(youtubeUrl, '_blank')}
          style={{ width: 48, height: 48, borderRadius: 8, background: T.accent, border: "none", color: "#fff", fontSize: 20, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          ▶
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>YouTube Audio</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Click to play (opens YouTube)</div>
        </div>
      </div>
    </div>
  );
}

// ---------- song detail view ----------
function SongDetail({ song, folderId, folders, setFolders, onDelete, onAssign, soundcloudProfile, onPlayAudio, onCreateNewSongFromAI }) {
  const [showNewLink, setShowNewLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl]     = useState("");
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [editLinkLabel, setEditLinkLabel] = useState("");
  const [editLinkUrl, setEditLinkUrl]     = useState("");
  const fileInputRef = useRef();

  const [showNewCredit,   setShowNewCredit]   = useState(false);
  const [newCreditName,   setNewCreditName]   = useState("");
  const [newCreditRole,   setNewCreditRole]   = useState("");
  const [editingCreditId, setEditingCreditId] = useState(null);
  const [editCreditName,  setEditCreditName]  = useState("");
  const [editCreditRole,  setEditCreditRole]  = useState("");

  const [expandedLinkId,  setExpandedLinkId]  = useState(null);

  if (!song) return null;

  function updateSong(patch) {
    setFolders(prev => {
      if (folderId === "unassigned") {
        return { ...prev, unassigned: prev.unassigned.map(s => s.id !== song.id ? s : { ...s, ...patch }) };
      }
      return {
        ...prev,
        folders: prev.folders.map(f => f.id !== folderId ? f : {
          ...f, songs: f.songs.map(s => s.id !== song.id ? s : { ...s, ...patch })
        })
      };
    });
  }

  function addLink() {
    if (!newLinkUrl.trim()) return;
    const link = { id: genId(), label: newLinkLabel.trim() || newLinkUrl.trim(), url: newLinkUrl.trim() };
    updateSong({ links: [...(song.links || []), link] });
    setNewLinkLabel(""); setNewLinkUrl(""); setShowNewLink(false);
  }
  function saveEditLink() {
    if (!editLinkUrl.trim()) return;
    updateSong({ links: song.links.map(l => l.id !== editingLinkId ? l : { ...l, label: editLinkLabel.trim() || editLinkUrl.trim(), url: editLinkUrl.trim() }) });
    setEditingLinkId(null);
  }
  function removeLink(lid) { updateSong({ links: song.links.filter(l => l.id !== lid) }); }

  function addCredit() {
    if (!newCreditName.trim()) return;
    const credit = { id: genId(), name: newCreditName.trim(), role: newCreditRole.trim() };
    updateSong({ credits: [...(song.credits || []), credit] });
    setNewCreditName(""); setNewCreditRole(""); setShowNewCredit(false);
  }
  function saveEditCredit() {
    if (!editCreditName.trim()) return;
    updateSong({ credits: song.credits.map(c => c.id !== editingCreditId ? c : { ...c, name: editCreditName.trim(), role: editCreditRole.trim() }) });
    setEditingCreditId(null);
  }
  function removeCredit(cid) { updateSong({ credits: song.credits.filter(c => c.id !== cid) }); }

  function handleFile(e) {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setFolders(prev => {
          const entry = { id: genId(), name: file.name, size: file.size, type: file.type, dataUrl: ev.target.result };
          if (folderId === "unassigned") {
            return { ...prev, unassigned: prev.unassigned.map(s => s.id !== song.id ? s : { ...s, files: [...(s.files || []), entry] }) };
          }
          return {
            ...prev,
            folders: prev.folders.map(f => f.id !== folderId ? f : {
              ...f, songs: f.songs.map(s => s.id !== song.id ? s : { ...s, files: [...(s.files || []), entry] })
            })
          };
        });
      };
      reader.readAsDataURL(file);
    });
  }
  function renameFile(fid, newName) { updateSong({ files: song.files.map(f => f.id !== fid ? f : { ...f, name: newName }) }); }
  function removeFile(fid) { updateSong({ files: song.files.filter(f => f.id !== fid) }); }

  const audioFile = song.files?.find(f => f.type?.startsWith("audio/"));

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 14, marginBottom: 7, background: T.input, color: T.text };

  return (
    <div>
      {/* Title — big, bold hero */}
      <input
        value={song.title}
        onChange={e => updateSong({ title: e.target.value })}
        placeholder="Untitled Song"
        style={{
          fontSize: 40, fontWeight: 800, letterSpacing: -1.2,
          background: "none", border: "none", borderBottom: `3px solid ${T.border}`,
          width: "100%", marginBottom: 24, color: T.text, padding: "8px 0",
          outline: "none", transition: "border-color 0.2s"
        }}
        onFocus={e => e.target.style.borderBottomColor = T.accent}
        onBlur={e => e.target.style.borderBottomColor = T.border}
      />

      {audioFile && (
        <div style={{ marginBottom: 16 }}>
          <AudioPlayer file={audioFile} />
        </div>
      )}

      {/* Status pills — workflow indicator */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</span>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(STATUS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => updateSong({ status: key })}
              style={{
                padding: "8px 18px", borderRadius: 24, border: "none", fontSize: 13, fontWeight: 600,
                background: song.status === key ? val.color : T.cardAlt,
                color: song.status === key ? "#fff" : T.textMuted,
                cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                if (song.status !== key) {
                  e.target.style.background = T.border;
                  e.target.style.color = T.text;
                }
              }}
              onMouseLeave={e => {
                if (song.status !== key) {
                  e.target.style.background = T.cardAlt;
                  e.target.style.color = T.textMuted;
                }
              }}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Release ready */}
      {song.status === "done" && (
        <div style={{ ...cardStyle, borderLeft: `3px solid ${STATUS.done.color}` }}>
          <div style={sectionLabel}>Release Ready</div>
          {soundcloudProfile?.verified ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>🎧</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{soundcloudProfile.username || soundcloudProfile.url}</div>
                <div style={{ fontSize: 13, color: T.textMuted }}>SoundCloud connected</div>
              </div>
              <a href={`https://${soundcloudProfile.url}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: "8px 14px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                Open SoundCloud
              </a>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: T.textMuted }}>
              Connect your SoundCloud account in <strong style={{ color: T.text }}>More → SoundCloud</strong> to manage your release.
            </div>
          )}
        </div>
      )}

      {/* Assign to project */}
      {folderId === "unassigned" && folders.folders.length > 0 && (
        <div style={cardStyle}>
          <div style={sectionLabel}>Project</div>
          <select
            defaultValue=""
            onChange={e => { if (e.target.value) onAssign(song.id, e.target.value); }}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 15, background: T.input, color: T.text, appearance: "none" }}
          >
            <option value="" disabled>Move to project...</option>
            {folders.folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Lyrics — main writing surface */}
      <div style={{ background: T.card, borderRadius: 18, padding: "24px 28px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.3)", border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 14 }}>Lyrics</div>
        <textarea
          value={song.lyrics ?? ""}
          onChange={e => updateSong({ lyrics: e.target.value })}
          placeholder="Write your lyrics here…"
          rows={16}
          style={{
            width: "100%", border: "none", background: "none",
            fontSize: 16, color: T.text, resize: "none",
            lineHeight: 1.9, padding: 0, outline: "none",
            fontFamily: "'Courier New', monospace"
          }}
        />
      </div>

      {/* AI Song Starter */}
      <AISongStarter
        song={song}
        onInsertLyrics={lyrics => updateSong({ lyrics })}
        onCreateNewSong={onCreateNewSongFromAI}
      />

      {/* Notes — production notes */}
      <div style={{ background: T.cardAlt, borderRadius: 16, padding: "20px 24px", marginBottom: 20, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.orange, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>Production Notes</div>
        <textarea
          value={song.notes ?? ""}
          onChange={e => updateSong({ notes: e.target.value })}
          placeholder="Tempo, key, ideas, mood, references…"
          rows={4}
          style={{
            width: "100%", border: "none", background: "none",
            fontSize: 14, color: T.textMuted, resize: "none",
            lineHeight: 1.6, padding: 0, outline: "none"
          }}
        />
      </div>

      {/* Links — references & inspiration */}
      <div style={{ background: T.card, borderRadius: 16, padding: "20px 24px", marginBottom: 20, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.green, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 14 }}>References</div>
        {song.links?.map((link, i) => {
          const embed = getLinkEmbed(link.url);
          const isExpanded = expandedLinkId === link.id;
          return (
            <div key={link.id}>
              {i > 0 && <Divider />}
              {editingLinkId === link.id ? (
                <div>
                  <input autoFocus value={editLinkLabel} onChange={e => setEditLinkLabel(e.target.value)} placeholder="Label"
                    style={{ ...inputStyle, border: `1px solid ${T.accent}` }} />
                  <input value={editLinkUrl} onChange={e => setEditLinkUrl(e.target.value)} placeholder="https://..."
                    onKeyDown={e => { if (e.key === "Enter") saveEditLink(); if (e.key === "Escape") setEditingLinkId(null); }}
                    style={{ ...inputStyle, marginBottom: 10 }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditingLinkId(null)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.cardAlt, fontSize: 14, color: T.text }}>Cancel</button>
                    <button onClick={saveEditLink} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: T.accent, fontSize: 14, fontWeight: 600, color: "#fff" }}>Save</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {embed ? (
                      <button onClick={() => setExpandedLinkId(isExpanded ? null : link.id)}
                        style={{ background: "none", border: "none", fontSize: 17, padding: 0, lineHeight: 1, cursor: "pointer" }}
                        title={isExpanded ? "Close player" : "Play on YouTube"}>
                        {isExpanded ? "⏹" : "▶️"}
                      </button>
                    ) : (
                      <span style={{ fontSize: 17 }}>🔗</span>
                    )}
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, color: T.accent, fontSize: 15, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.label}</a>
                    <button onClick={() => { setEditingLinkId(link.id); setEditLinkLabel(link.label); setEditLinkUrl(link.url); }}
                      style={{ background: "none", border: "none", color: T.accent, fontSize: 13, opacity: 0.8 }}>Edit</button>
                    <button onClick={e => { e.stopPropagation(); removeLink(link.id); }}
                      style={{ background: "none", border: "none", color: T.textFaint, fontSize: 22, lineHeight: 1 }}>×</button>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: 12 }}>
                      <LinkPlayer url={link.url} />
                      {getYouTubeId(link.url) && (
                        <button onClick={() => onPlayAudio(song, "youtube")}
                          style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: T.accent, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          ▶ Play audio in background
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {song.links?.length > 0 && <Divider />}
        {showNewLink ? (
          <div>
            <input autoFocus placeholder="Label (optional)" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)}
              style={inputStyle} />
            <input placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addLink(); if (e.key === "Escape") setShowNewLink(false); }}
              style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowNewLink(false)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.cardAlt, fontSize: 14, color: T.text }}>Cancel</button>
              <button onClick={addLink} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: T.accent, fontSize: 14, fontWeight: 600, color: "#fff" }}>Add</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewLink(true)} style={{ background: "none", border: "none", color: T.accent, fontSize: 15, padding: 0 }}>+ Add Link</button>
        )}
      </div>

      {/* Files */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Files</div>
        {song.files?.map((file, i) => (
          <div key={file.id}>
            {i > 0 && <Divider />}
            {file.type?.startsWith("audio/") && <AudioPlayer file={file} />}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: file.type?.startsWith("audio/") ? 6 : 0 }}>
              <span style={{ fontSize: 17 }}>📎</span>
              <EditableText value={file.name} onSave={val => val.trim() && renameFile(file.id, val.trim())}
                placeholder="filename" style={{ flex: 1, fontSize: 14, color: T.text }} />
              <span style={{ fontSize: 12, color: T.textFaint, flexShrink: 0 }}>{(file.size / 1024).toFixed(0)} KB</span>
              {file.type?.startsWith("audio/") && (
                <button onClick={() => onPlayAudio(song, "file")}
                  style={{ background: "none", border: "none", color: T.accent, fontSize: 16, padding: 0, cursor: "pointer" }}>
                  ▶
                </button>
              )}
              <a href={file.dataUrl} download={file.name} style={{ color: T.accent, fontSize: 13, textDecoration: "none", flexShrink: 0 }}>↓</a>
              <button onClick={e => { e.stopPropagation(); removeFile(file.id); }}
                style={{ background: "none", border: "none", color: T.textFaint, fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
          </div>
        ))}
        {song.files?.length > 0 && <Divider />}
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleFile} />
        <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", color: T.accent, fontSize: 15, padding: 0 }}>+ Attach File</button>
      </div>

      {/* Credits */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Credits</div>
        {(song.credits || []).map((credit, i) => (
          <div key={credit.id}>
            {i > 0 && <Divider />}
            {editingCreditId === credit.id ? (
              <div>
                <input autoFocus value={editCreditName} onChange={e => setEditCreditName(e.target.value)} placeholder="Name"
                  style={{ ...inputStyle, border: `1px solid ${T.accent}` }} />
                <input value={editCreditRole} onChange={e => setEditCreditRole(e.target.value)} placeholder="Role (e.g. Producer, Vocals)"
                  onKeyDown={e => { if (e.key === "Enter") saveEditCredit(); if (e.key === "Escape") setEditingCreditId(null); }}
                  style={{ ...inputStyle, marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setEditingCreditId(null)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.cardAlt, fontSize: 14, color: T.text }}>Cancel</button>
                  <button onClick={saveEditCredit} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: T.accent, fontSize: 14, fontWeight: 600, color: "#fff" }}>Save</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 15, color: T.text, fontWeight: 500 }}>{credit.name}</span>
                  {credit.role && <span style={{ fontSize: 13, color: T.textMuted, marginLeft: 8 }}>{credit.role}</span>}
                </div>
                <button onClick={() => { setEditingCreditId(credit.id); setEditCreditName(credit.name); setEditCreditRole(credit.role); }}
                  style={{ background: "none", border: "none", color: T.accent, fontSize: 13, opacity: 0.8 }}>Edit</button>
                <button onClick={e => { e.stopPropagation(); removeCredit(credit.id); }}
                  style={{ background: "none", border: "none", color: T.textFaint, fontSize: 22, lineHeight: 1 }}>×</button>
              </div>
            )}
          </div>
        ))}
        {(song.credits || []).length > 0 && <Divider />}
        {showNewCredit ? (
          <div>
            <input autoFocus placeholder="Name" value={newCreditName} onChange={e => setNewCreditName(e.target.value)}
              style={inputStyle} />
            <input placeholder="Role (e.g. Producer, Vocals)" value={newCreditRole} onChange={e => setNewCreditRole(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addCredit(); if (e.key === "Escape") setShowNewCredit(false); }}
              style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowNewCredit(false)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.cardAlt, fontSize: 14, color: T.text }}>Cancel</button>
              <button onClick={addCredit} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: T.accent, fontSize: 14, fontWeight: 600, color: "#fff" }}>Add</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewCredit(true)} style={{ background: "none", border: "none", color: T.accent, fontSize: 15, padding: 0 }}>+ Add Credit</button>
        )}
      </div>

      {/* Archive song */}
      <button onClick={e => { e.stopPropagation(); onDelete(song.id); }}
        style={{ width: "100%", padding: "13px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, fontSize: 15, color: T.textMuted, fontWeight: 500, boxShadow: T.shadow }}>
        Archive Song
      </button>
    </div>
  );
}

// ---------- flat song row (draggable) ----------
function SongRow({ song, folderName, folderColor, onClick, folderId, isDragging }) {
  const st = STATUS[song.status] || STATUS.idea;
  const audioFile = song.files?.find(f => f.type?.startsWith("audio/"));

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ songId: song.id, sourceFolderId: folderId ?? "unassigned" }));
  }

  return (
    <div
      className="row press"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      style={{
        padding: "13px 16px", display: "flex", alignItems: "center", gap: 12,
        cursor: "grab", transition: "background 0.1s, opacity 0.15s",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {/* drag handle */}
      <div style={{ color: T.textFaint, flexShrink: 0, marginRight: -4, touchAction: "none" }}>
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" opacity="0.5">
          <circle cx="3" cy="2.5" r="1.2"/><circle cx="7" cy="2.5" r="1.2"/>
          <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
          <circle cx="3" cy="11.5" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.text }}>{song.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: st.color, fontWeight: 500 }}>{st.label}</span>
          {folderName && (
            <span style={{ fontSize: 12, background: (folderColor || T.textMuted) + "25", color: folderColor || T.textMuted, borderRadius: 6, padding: "1px 7px" }}>{folderName}</span>
          )}
          {audioFile && <span style={{ fontSize: 12, color: T.textFaint }}>🎵</span>}
          {song.lyrics ? <span style={{ fontSize: 12, color: T.textFaint }}>Lyrics</span> : null}
          {song.links?.length > 0 ? <span style={{ fontSize: 12, color: T.textFaint }}>{song.links.length} link{song.links.length > 1 ? "s" : ""}</span> : null}
        </div>
      </div>
      <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><path d="M1 1L5.5 5.5L1 10" stroke="#48484A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

// ============================================================
// Main app
// ============================================================
export default function LyricLab() {
  // ── Auth + cloud sync ──
  const initialSession = getStoredSession() ?? null;
  const [session,  setSession]  = useState(initialSession);
  const [loading,  setLoading]  = useState(!!initialSession);
  const [showAuth, setShowAuth] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [state,    setStateRaw] = useState({ folders: [], unassigned: [], archived: [], soundcloudProfile: null });
  const saveTimerRef   = useRef(null);
  const hasLoadedData  = useRef(false);   // never auto-save until at least one real load
  const BACKUP_KEY     = "sv_local_backup";

  function hydrateState(data) {
    const safe = {
      folders:          data.folders          ?? [],
      unassigned:       data.unassigned       ?? [],
      archived:         data.archived         ?? [],
      soundcloudProfile: data.soundcloudProfile ?? null,
    };
    setStateRaw(safe);
    hasLoadedData.current = true;
    // Mirror every successful load to localStorage as a local backup
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ ...safe, _savedAt: Date.now() })); } catch (e) { void e; }
  }

  function countSongs(s) {
    return (s.unassigned?.length ?? 0) +
           (s.folders?.reduce((n, f) => n + (f.songs?.length ?? 0), 0) ?? 0);
  }

  async function loadData() {
    try {
      const res = await apiGetData();
      if (res.data) {
        hydrateState(res.data);
      } else {
        // Cloud returned nothing — fall back to local backup silently
        const raw = localStorage.getItem(BACKUP_KEY);
        if (raw) {
          const backup = JSON.parse(raw);
          hydrateState(backup);
          // Push backup back up to the server so it's there next time
          await apiSaveData(backup);
        }
      }
    } catch {
      // Network error — try local backup
      const raw = localStorage.getItem(BACKUP_KEY);
      if (raw) { try { hydrateState(JSON.parse(raw)); } catch (e) { void e; } }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (getStoredSession()) {
      apiGetData().then(res => {
        if (res.data) hydrateState(res.data);
        setLoading(false);
      });
    }
  }, []);

  // Debounced auto-save — only fires after real data has been loaded at least once
  useEffect(() => {
    if (!session || loading || session.user?.isGuest || !hasLoadedData.current) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Safety check: never overwrite more data than we loaded
      const backup = (() => { try { return JSON.parse(localStorage.getItem(BACKUP_KEY) ?? "null"); } catch { return null; } })();
      const backupCount = backup ? countSongs(backup) : 0;
      const currentCount = countSongs(state);
      if (backupCount > 0 && currentCount === 0) return; // refuse to wipe data
      apiSaveData(state);
    }, 1500);
    return () => clearTimeout(saveTimerRef.current);
  }, [state, session, loading]);

  function handleAuth(user) {
    setLoading(true); // block auto-save until real data is loaded
    setSession({ user });
    setIsUnlocking(true);
    setTimeout(() => {
      setIsUnlocking(false);
      if (!user.isGuest) loadData();
      else setLoading(false);
    }, 1800);
  }

  async function handleLogout() {
    clearTimeout(saveTimerRef.current);
    if (!session?.user?.isGuest && hasLoadedData.current) await apiSaveData(state);
    apiLogout();
    hasLoadedData.current = false;
    setSession(null);
    setStateRaw({ folders: [], unassigned: [], archived: [], soundcloudProfile: null });
  }

  function setState(updater) {
    setStateRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return { ...prev, ...next };
    });
  }

  const { folders, unassigned, archived, soundcloudProfile } = state;

  const [tab, setTab] = useState("songs");
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeSongId,   setActiveSongId]   = useState(null);
  const [activeSongContext, setActiveSongContext] = useState(null);

  const activeFolder = folders.find(f => f.id === activeFolderId) ?? null;
  const activeSong = (() => {
    if (!activeSongId) return null;
    if (activeSongContext === "unassigned") return unassigned.find(s => s.id === activeSongId) ?? null;
    const folder = folders.find(f => f.id === activeSongContext);
    return folder?.songs.find(s => s.id === activeSongId) ?? null;
  })();

  const [showNewFolder,   setShowNewFolder]   = useState(false);
  const [newFolderName,   setNewFolderName]   = useState("");
  const [newFolderColor,  setNewFolderColor]  = useState(COLORS[0]);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editFolderName,  setEditFolderName]  = useState("");
  const [editFolderColor, setEditFolderColor] = useState(COLORS[0]);

  const [userQuery,    setUserQuery]    = useState("");
  const [userResults,  setUserResults]  = useState(null);
  const [userSearching, setUserSearching] = useState(false);

  const [scInput,      setScInput]      = useState(soundcloudProfile?.url || "");
  const [scCodeSent,   setScCodeSent]   = useState(false);
  const [scCode,       setScCode]       = useState("");
  const [scVerifying,  setScVerifying]  = useState(false);
  const [scSending,    setScSending]    = useState(false);
  const [scError,      setScError]      = useState(null);

  const [nowPlaying,   setNowPlaying]   = useState(null);

  function normalizeScUrl(raw) { return raw.trim().replace(/^https?:\/\//i, "").replace(/\/$/, ""); }

  async function scSendCode() {
    if (!scInput.trim()) return;
    setScSending(true); setScError(null);
    const url = normalizeScUrl(scInput);
    const res = await apiSoundCloudSendCode(url);
    setScSending(false);
    if (res.error) { setScError(res.error); return; }
    setScInput(url);
    setScCodeSent(true);
  }

  async function scVerify() {
    if (!scCode.trim()) return;
    setScVerifying(true); setScError(null);
    const url = normalizeScUrl(scInput);
    const res = await apiSoundCloudVerifyCode(url, scCode.trim());
    setScVerifying(false);
    if (res.error || !res.verified) { setScError(res.error || "Code incorrect or expired."); return; }
    setState({ soundcloudProfile: { url, username: res.username || url, verified: true } });
    setScCodeSent(false); setScCode("");
  }

  function scDisconnect() {
    setState({ soundcloudProfile: null });
    setScInput(""); setScCodeSent(false); setScCode(""); setScError(null);
  }

  async function searchUsers() {
    if (!userQuery.trim()) return;
    setUserSearching(true);
    const res = await apiSearchUsers(userQuery.trim());
    setUserSearching(false);
    setUserResults(res.users ?? []);
  }

  async function playAudio(song, source) {
    if (!song) return;
    let audioUrl = null;
    let title = song.title || "Untitled";
    let artist = "";

    if (source === "file") {
      const audioFile = song.files?.find(f => f.type?.startsWith("audio/"));
      if (audioFile?.dataUrl) {
        audioUrl = audioFile.dataUrl;
        artist = "LyricLab";
      }
    } else if (source === "youtube") {
      const link = song.links?.find(l => getYouTubeId(l.url));
      if (link) {
        const ytId = getYouTubeId(link.url);
        artist = `YouTube · ${link.label}`;
        audioUrl = await getYouTubeAudioUrl(ytId);
      }
    }

    if (!audioUrl) return;

    globalAudioElement.src = audioUrl;
    globalAudioElement.play().catch(() => {});
    setNowPlaying({ title, artist });

    if (navigator.mediaSession) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: "LyricLab"
      });
      navigator.mediaSession.setActionHandler("play", () => globalAudioElement.play());
      navigator.mediaSession.setActionHandler("pause", () => globalAudioElement.pause());
    }
  }

  useEffect(() => {
    if (!nowPlaying) return;
    if (navigator.mediaSession) {
      navigator.mediaSession.playbackState = globalAudioElement.paused ? "paused" : "playing";
    }
  }, [nowPlaying]);

  function createFolder() {
    if (!newFolderName.trim()) return;
    const f = { id: genId(), name: newFolderName.trim(), color: newFolderColor, songs: [] };
    setState(prev => ({ folders: [...prev.folders, f] }));
    setActiveFolderId(f.id);
    setNewFolderName(""); setShowNewFolder(false);
  }
  function saveEditFolder() {
    if (!editFolderName.trim()) return;
    setState(prev => ({ folders: prev.folders.map(f => f.id !== editingFolderId ? f : { ...f, name: editFolderName.trim(), color: editFolderColor }) }));
    setEditingFolderId(null);
  }
  function deleteFolder(id) {
    if (!confirm("Delete this folder and all its songs?")) return;
    setState(prev => ({ folders: prev.folders.filter(f => f.id !== id) }));
    if (activeFolderId === id) { setActiveFolderId(null); setActiveSongId(null); setActiveSongContext(null); }
  }

  // Create untitled song directly in a project folder, open it immediately
  function quickCreateSongInFolder(folderId) {
    const s = { id: genId(), title: "Untitled", status: "idea", lyrics: "", notes: "", links: [], files: [], credits: [] };
    setState(prev => ({ folders: prev.folders.map(f => f.id !== folderId ? f : { ...f, songs: [...f.songs, s] }) }));
    setActiveSongContext(folderId);
    setActiveSongId(s.id);
  }

  function quickCreateSong() {
    const s = { id: genId(), title: "Untitled", status: "idea", lyrics: "", notes: "", links: [], files: [], credits: [] };
    setState(prev => ({ unassigned: [...prev.unassigned, s] }));
    setTab("songs");
    setActiveFolderId(null);
    setActiveSongContext("unassigned");
    setActiveSongId(s.id);
  }

  function archiveSong(id) {
    setState(prev => {
      let song = null;
      let updatedFolders = prev.folders;
      let updatedUnassigned = prev.unassigned;
      if (activeSongContext === "unassigned") {
        song = prev.unassigned.find(s => s.id === id);
        updatedUnassigned = prev.unassigned.filter(s => s.id !== id);
      } else {
        const folder = prev.folders.find(f => f.id === activeSongContext);
        song = folder?.songs.find(s => s.id === id);
        updatedFolders = prev.folders.map(f => f.id !== activeSongContext ? f : { ...f, songs: f.songs.filter(s => s.id !== id) });
      }
      if (!song) return prev;
      const archivedEntry = { ...song, _archivedFrom: activeSongContext, _archivedAt: Date.now() };
      return { folders: updatedFolders, unassigned: updatedUnassigned, archived: [...prev.archived, archivedEntry] };
    });
    setActiveSongId(null);
    setActiveSongContext(null);
  }

  function restoreSong(id) {
    setState(prev => {
      const song = prev.archived.find(s => s.id === id);
      if (!song) return prev;
      const { _archivedFrom, _archivedAt, ...cleanSong } = song;
      const newArchived = prev.archived.filter(s => s.id !== id);
      if (_archivedFrom === "unassigned" || !prev.folders.find(f => f.id === _archivedFrom)) {
        return { archived: newArchived, unassigned: [...prev.unassigned, cleanSong] };
      }
      return { archived: newArchived, folders: prev.folders.map(f => f.id !== _archivedFrom ? f : { ...f, songs: [...f.songs, cleanSong] }) };
    });
  }

  function permanentlyDeleteSong(id) {
    if (!confirm("Permanently delete this song? This cannot be undone.")) return;
    setState(prev => ({ archived: prev.archived.filter(s => s.id !== id) }));
  }

  function assignSongToFolder(songId, folderId) {
    setState(prev => {
      const song = prev.unassigned.find(s => s.id === songId);
      if (!song) return prev;
      return {
        unassigned: prev.unassigned.filter(s => s.id !== songId),
        folders: prev.folders.map(f => f.id !== folderId ? f : { ...f, songs: [...f.songs, song] })
      };
    });
    setActiveSongContext(folderId);
  }

  function openSong(songId, context) { setActiveSongId(songId); setActiveSongContext(context); }
  function backFromSong() { setActiveSongId(null); setActiveSongContext(null); }
  function backFromFolder() { setActiveFolderId(null); setActiveSongId(null); setActiveSongContext(null); }

  // ── Drag-and-drop: move a song between sections ──
  const [draggingSongId, setDraggingSongId] = useState(null);
  const [dropTarget, setDropTarget]         = useState(null); // "unassigned" | folder.id

  function moveSong(songId, sourceFolderId, targetFolderId) {
    if (sourceFolderId === targetFolderId) return;
    setState(prev => {
      let song = null;
      let newUnassigned = prev.unassigned;
      let newFolders = prev.folders;

      // Remove from source
      if (sourceFolderId === "unassigned") {
        song = prev.unassigned.find(s => s.id === songId);
        newUnassigned = prev.unassigned.filter(s => s.id !== songId);
      } else {
        const srcFolder = prev.folders.find(f => f.id === sourceFolderId);
        song = srcFolder?.songs.find(s => s.id === songId);
        newFolders = newFolders.map(f => f.id !== sourceFolderId ? f : { ...f, songs: f.songs.filter(s => s.id !== songId) });
      }
      if (!song) return prev;

      // Add to target
      if (targetFolderId === "unassigned") {
        newUnassigned = [...newUnassigned, song];
      } else {
        newFolders = newFolders.map(f => f.id !== targetFolderId ? f : { ...f, songs: [...f.songs, song] });
      }
      return { ...prev, unassigned: newUnassigned, folders: newFolders };
    });
    // Update active context if the dragged song was active
    if (activeSongId === songId) setActiveSongContext(targetFolderId);
  }

  function handleSectionDrop(e, targetFolderId) {
    e.preventDefault();
    setDropTarget(null);
    setDraggingSongId(null);
    try {
      const { songId, sourceFolderId } = JSON.parse(e.dataTransfer.getData("text/plain"));
      moveSong(songId, sourceFolderId, targetFolderId);
    } catch { /* ignore invalid drops */ }
  }

  function handleSectionDragOver(e, targetFolderId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(targetFolderId);
  }

  // ── Flow Lab: create a new project from flow export ──
  // Only creates a NEW project + seed song. Does not touch existing data.
  function createProjectFromFlow({ title, bpm, patterns, barCount, notes }) {
    const folderId = genId();
    const seedSong = {
      id: genId(),
      title: `Flow Blueprint — ${bpm} BPM`,
      status: "idea",
      lyrics: "",
      notes,
      links: [],
      files: [],
      credits: [],
    };
    const folder = {
      id: folderId,
      name: title,
      color: "#0A84FF",
      songs: [seedSong],
      _flowMeta: { bpm, patternCount: patterns?.length ?? 0, barCount },
    };
    setState(prev => ({ folders: [...prev.folders, folder] }));
    setTab("projects");
    setActiveFolderId(folderId);
    setActiveSongId(seedSong.id);
    setActiveSongContext(folderId);
  }

  const allSongs = [
    ...unassigned.map(s => ({ song: s, folderId: "unassigned", folderName: null, folderColor: null })),
    ...folders.flatMap(f => f.songs.map(s => ({ song: s, folderId: f.id, folderName: f.name, folderColor: f.color })))
  ];

  const tabBtn = (active) => ({
    flex: 1, padding: "8px 0", background: "none", border: "none", fontSize: 14, fontWeight: active ? 600 : 400,
    color: active ? T.accent : T.textMuted,
    borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
    cursor: "pointer", transition: "all 0.15s"
  });

  function renderNavBar() {
    if (activeSong) {
      const backLabel = activeSongContext === "unassigned"
        ? "Songs"
        : (folders.find(f => f.id === activeSongContext)?.name ?? "Back");
      return (
        <>
          <button onClick={backFromSong} style={{ background: "none", border: "none", color: T.accent, fontSize: 16, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L1.5 7.5L7.5 13.5" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {backLabel}
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={e => { e.stopPropagation(); archiveSong(activeSong.id); }}
            style={{ background: "none", border: "none", color: T.textMuted, fontSize: 15 }}>Archive</button>
        </>
      );
    }
    if (tab === "projects" && activeFolderId) {
      return (
        <button onClick={backFromFolder} style={{ background: "none", border: "none", color: T.accent, fontSize: 16, display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L1.5 7.5L7.5 13.5" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Projects
        </button>
      );
    }
    const displayName = session?.user?.username || session?.user?.email?.split("@")[0] || "Vault";
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MusicNoteKeyhole size={26} color={T.accent} />
          <span style={{ fontSize: 17, fontWeight: 600, color: T.text }}>LyricLab</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: T.textMuted, marginRight: 10 }}>{displayName}</span>
        <button onClick={handleLogout}
          style={{ background: "none", border: `1px solid ${T.border}`, color: T.textMuted, fontSize: 13, borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>
          Sign Out
        </button>
      </>
    );
  }

  const formCard = { background: T.card, borderRadius: 14, padding: 16, boxShadow: T.shadow };
  const inputBase = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 16, marginBottom: 12, background: T.input, color: T.text };
  const btnSecondary = { flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.cardAlt, fontSize: 15, fontWeight: 500, color: T.text };
  const btnPrimary   = (bg) => ({ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: bg || T.accent, fontSize: 15, fontWeight: 600, color: "#fff" });
  const dashedBtn    = (color) => ({ width: "100%", padding: "14px", borderRadius: 12, border: `2px dashed ${T.border}`, background: "transparent", fontSize: 15, color: color || T.accent, fontWeight: 500 });
  const listCard     = { background: T.card, borderRadius: 14, overflow: "hidden", boxShadow: T.shadow, marginBottom: 16 };
  const rowDivider   = { height: 1, background: T.divider, marginLeft: 16 };

  // ── Auth gates ──
  if (session === undefined) return (
    <div style={{ minHeight: "100dvh", background: "#0F0F11", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#98989D", fontSize: 15, fontFamily: "Inter, sans-serif" }}>Loading…</div>
    </div>
  );
  if (!session && !showAuth) return <LandingPage onGetStarted={() => setShowAuth(true)} onSignIn={() => setShowAuth(true)} />;
  if (!session) return <AuthScreen onAuth={handleAuth} />;
  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#0F0F11", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 32 }}>🎵</div>
      <div style={{ color: "#98989D", fontSize: 15, fontFamily: "Inter, sans-serif" }}>Loading your vault…</div>
    </div>
  );

  const TAB_ICONS = {
    songs:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
    projects: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    flowlab:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 9.17l4.24-4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M9.17 14.83l-4.24 4.24"/><circle cx="12" cy="2" r="1"/><circle cx="12" cy="22" r="1"/><circle cx="2" cy="12" r="1"/><circle cx="22" cy="12" r="1"/></svg>,
    more:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  };

  return (
    <div className="app-root" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; height: 100dvh; overflow: hidden; background: ${T.bg}; }
        button { cursor: pointer; font-family: inherit; }
        input, textarea { font-family: inherit; }
        textarea:focus, input:focus { outline: none; }
        textarea::placeholder, input::placeholder { color: #48484A; }
        .row:hover { background: #252527 !important; }
        .press:active { opacity: 0.7; }
        audio { border-radius: 8px; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3A3A3C; border-radius: 3px; }

        @keyframes keyhole-unlock {
          0%   { opacity: 1; transform: scale(0.85); }
          40%  { opacity: 1; transform: scale(1.05); }
          75%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.95); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .keyhole-icon {
          animation: keyhole-unlock 1.8s ease-out forwards;
          will-change: opacity, transform;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        * { transition: background-color 0.2s, color 0.2s, border-color 0.2s; }
        button { transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }

        /* ── Layout shell ── */
        .app-root {
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: ${T.bg};
        }
        .app-nav {
          flex-shrink: 0;
          background: rgba(15,15,17,0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          padding: 0 20px;
          height: 52px;
          display: flex;
          align-items: center;
          z-index: 10;
        }
        .app-body {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        /* ── Sidebar (desktop only) ── */
        .sidebar {
          display: none;
        }
        .sidebar-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: none;
          color: ${T.textMuted};
          font-size: 14px;
          font-weight: 500;
          border-radius: 10px;
          transition: background 0.15s, color 0.15s;
          text-align: left;
        }
        .sidebar-btn:hover { background: #252527; color: ${T.text}; }
        .sidebar-btn.active { background: #252527; color: ${T.accent}; }

        /* ── Tab bar (mobile/tablet) ── */
        .top-tab-bar {
          flex-shrink: 0;
          background: ${T.card};
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          padding: 0 20px;
          z-index: 9;
        }

        /* ── Content area ── */
        .content-scroll {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .content-main {
          flex: 1;
          overflow-y: auto;
        }
        .content-inner {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          padding: 20px 16px 48px;
          flex: 1;
        }

        /* ── Tablet ── */
        @media (min-width: 640px) {
          .content-inner {
            max-width: 680px;
            padding: 24px 24px 48px;
          }
        }

        /* ── Desktop ── */
        @media (min-width: 1024px) {
          .app-nav { padding: 0 28px; }
          .sidebar {
            display: flex;
            flex-direction: column;
            width: 220px;
            flex-shrink: 0;
            background: ${T.card};
            border-right: 1px solid rgba(255,255,255,0.06);
            padding: 20px 12px;
            gap: 4px;
            overflow-y: auto;
          }
          .top-tab-bar { display: none; }
          .content-inner {
            max-width: 780px;
            padding: 32px 40px 60px;
          }
        }

        /* ── Wide desktop ── */
        @media (min-width: 1400px) {
          .sidebar { width: 260px; }
          .content-inner { max-width: 960px; }
        }
      `}</style>

      {/* Unlock Animation */}
      {isUnlocking && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, pointerEvents: "none" }}>
          <div className="keyhole-icon">
            <MusicNoteKeyhole size={140} color={T.accent} />
          </div>
        </div>
      )}

      {/* Nav bar */}
      <div className="app-nav">
        {renderNavBar()}
      </div>

      <div className="app-body">

        {/* Sidebar — desktop */}
        <div className="sidebar">
          {[["songs", "Songs"], ["projects", "Projects"], ["flowlab", "Flow Lab"], ["more", "More"]].map(([key, label]) => (
            <button key={key}
              className={`sidebar-btn${tab === key && !activeSong ? " active" : ""}`}
              onClick={() => { setTab(key); setActiveFolderId(null); setActiveSongId(null); setActiveSongContext(null); }}>
              {TAB_ICONS[key]}
              {label}
            </button>
          ))}
        </div>

        <div className="content-scroll">

          {/* Tab bar — mobile / tablet */}
          {!activeSong && (
            <div className="top-tab-bar">
              {[["songs", "Songs"], ["projects", "Projects"], ["flowlab", "Flow Lab"], ["more", "More"]].map(([key, label]) => (
                <button key={key} style={tabBtn(tab === key)} onClick={() => { setTab(key); setActiveFolderId(null); setActiveSongId(null); setActiveSongContext(null); }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="content-main">
          <div className="content-inner">

        {/* Song detail */}
        {activeSong ? (
          <SongDetail
            song={activeSong}
            folderId={activeSongContext}
            folders={state}
            setFolders={setState}
            onDelete={archiveSong}
            onAssign={assignSongToFolder}
            soundcloudProfile={soundcloudProfile}
            onPlayAudio={playAudio}
            onCreateNewSongFromAI={lyrics => {
              const newSong = {
                id: genId(),
                title: "Untitled",
                status: "idea",
                lyrics,
                notes: "",
                links: [],
                files: [],
                credits: []
              };
              setState(prev => ({ unassigned: [...prev.unassigned, newSong] }));
              setActiveSongId(newSong.id);
              setActiveSongContext("unassigned");
            }}
          />
        ) : (

          <>
            {/* ══ SONGS TAB ══ */}
            {tab === "songs" && (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 20, color: T.text }}>All Songs</div>

                {/* ── AI Power Tools strip ── */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>AI Tools</div>
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                    {/* AI Song Starter */}
                    <button
                      onClick={quickCreateSong}
                      style={{
                        flexShrink: 0, width: 160, padding: "14px 14px 12px",
                        borderRadius: 14, border: `1px solid #BF5AF240`,
                        background: "linear-gradient(135deg, #BF5AF210 0%, #BF5AF205 100%)",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#BF5AF2"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#BF5AF240"}
                    >
                      <div style={{ fontSize: 22, marginBottom: 8 }}>✨</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>AI Song Starter</div>
                      <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>Generate lyrics or rhyming words for a new song</div>
                    </button>

                    {/* Writers Block Breaker */}
                    <button
                      onClick={() => document.getElementById("wbb-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      style={{
                        flexShrink: 0, width: 160, padding: "14px 14px 12px",
                        borderRadius: 14, border: `1px solid #FF9F0A40`,
                        background: "linear-gradient(135deg, #FF9F0A10 0%, #FF9F0A05 100%)",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#FF9F0A"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#FF9F0A40"}
                    >
                      <div style={{ fontSize: 22, marginBottom: 8 }}>⚡</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Block Breaker</div>
                      <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>Unstick a verse using your existing lyrics as context</div>
                    </button>

                    {/* Flow Lab */}
                    <button
                      onClick={() => setTab("flowlab")}
                      style={{
                        flexShrink: 0, width: 160, padding: "14px 14px 12px",
                        borderRadius: 14, border: `1px solid #0A84FF40`,
                        background: "linear-gradient(135deg, #0A84FF10 0%, #0A84FF05 100%)",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#0A84FF40"}
                    >
                      <div style={{ fontSize: 22, marginBottom: 8 }}>🎛️</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>Flowlab</div>
                      <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>Detect BPM &amp; generate rap flow patterns from a beat</div>
                    </button>
                  </div>
                </div>

                {/* Writers Block Breaker panel */}
                {allSongs.length > 0 && (
                  <div id="wbb-panel">
                    <WritersBlockBreaker
                      songs={allSongs}
                      onInsertIntoSong={(songId, newLyrics) => {
                        setState(prev => {
                          const context = unassigned.find(s => s.id === songId) ? "unassigned" : prev.folders.find(f => f.songs.find(s => s.id === songId))?.id;
                          if (context === "unassigned") {
                            return { ...prev, unassigned: prev.unassigned.map(s => s.id !== songId ? s : { ...s, lyrics: (s.lyrics ? s.lyrics + "\n\n" : "") + newLyrics }) };
                          }
                          return {
                            ...prev,
                            folders: prev.folders.map(f => f.id !== context ? f : { ...f, songs: f.songs.map(s => s.id !== songId ? s : { ...s, lyrics: (s.lyrics ? s.lyrics + "\n\n" : "") + newLyrics }) })
                          };
                        });
                      }}
                    />
                  </div>
                )}

                {allSongs.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0 32px", color: T.textMuted }}>
                    <div style={{ fontSize: 52, marginBottom: 14, lineHeight: 1 }}>🎶</div>
                    <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: T.textSub }}>Your lab is empty</div>
                    <div style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280, margin: "0 auto" }}>
                      Tap <strong style={{ color: T.accent }}>+</strong> to start a new song — no title needed.
                    </div>
                  </div>
                )}

                {/* Unassigned drop zone */}
                {unassigned.length > 0 && (
                  <div
                    style={{ marginBottom: 16 }}
                    onDragOver={e => handleSectionDragOver(e, "unassigned")}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={e => handleSectionDrop(e, "unassigned")}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6, paddingLeft: 4 }}>Unassigned</div>
                    <div style={{ ...listCard, border: `1px solid ${dropTarget === "unassigned" ? T.accent : "transparent"}`, transition: "border-color 0.15s" }}>
                      {unassigned.map((song, i) => (
                        <div key={song.id}
                          draggable
                          onDragStart={() => setDraggingSongId(song.id)}
                          onDragEnd={() => { setDraggingSongId(null); setDropTarget(null); }}
                        >
                          {i > 0 && <div style={rowDivider} />}
                          <SongRow song={song} folderId="unassigned" folderName={null} folderColor={null} onClick={() => openSong(song.id, "unassigned")} isDragging={draggingSongId === song.id} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {folders.filter(f => f.songs.length > 0).map(folder => (
                  <div key={folder.id}
                    style={{ marginBottom: 16 }}
                    onDragOver={e => handleSectionDragOver(e, folder.id)}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={e => handleSectionDrop(e, folder.id)}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: folder.color, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6, paddingLeft: 4 }}>{folder.name}</div>
                    <div style={{ ...listCard, border: `1px solid ${dropTarget === folder.id ? folder.color : "transparent"}`, transition: "border-color 0.15s" }}>
                      {folder.songs.map((song, i) => (
                        <div key={song.id}
                          draggable
                          onDragStart={() => setDraggingSongId(song.id)}
                          onDragEnd={() => { setDraggingSongId(null); setDropTarget(null); }}
                        >
                          {i > 0 && <div style={rowDivider} />}
                          <SongRow song={song} folderId={folder.id} folderName={folder.name} folderColor={folder.color} onClick={() => openSong(song.id, folder.id)} isDragging={draggingSongId === song.id} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Drop zone for unassigned when empty */}
                {unassigned.length === 0 && allSongs.length > 0 && (
                  <div
                    onDragOver={e => handleSectionDragOver(e, "unassigned")}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={e => handleSectionDrop(e, "unassigned")}
                    style={{
                      marginBottom: 16, padding: "16px", borderRadius: 12,
                      border: `2px dashed ${dropTarget === "unassigned" ? T.accent : T.border}`,
                      textAlign: "center", fontSize: 13, color: dropTarget === "unassigned" ? T.accent : T.textFaint,
                      transition: "all 0.15s",
                    }}
                  >
                    Drop here to unassign
                  </div>
                )}

                <button onClick={quickCreateSong} className="press" style={dashedBtn()}>
                  + New Song
                </button>

                {archived.length > 0 && (
                  <div style={{ marginTop: 32 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6, paddingLeft: 4 }}>Archived</div>
                    <div style={listCard}>
                      {archived.map((song, i) => {
                        const origin = song._archivedFrom === "unassigned" ? "Unassigned" : (folders.find(f => f.id === song._archivedFrom)?.name ?? "Unknown");
                        const st = STATUS[song.status] || STATUS.idea;
                        return (
                          <div key={song.id}>
                            {i > 0 && <div style={rowDivider} />}
                            <div style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 500, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</div>
                                <div style={{ fontSize: 12, color: T.textFaint, marginTop: 2 }}>
                                  <span style={{ color: st.color }}>{st.label}</span>
                                  {" · "}from {origin}
                                </div>
                              </div>
                              <button onClick={() => restoreSong(song.id)}
                                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, color: T.accent, fontSize: 13, padding: "5px 10px", flexShrink: 0 }}>
                                Restore
                              </button>
                              <button onClick={() => permanentlyDeleteSong(song.id)}
                                style={{ background: "none", border: "none", color: T.textFaint, fontSize: 22, lineHeight: 1, flexShrink: 0 }}>×</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ PROJECTS TAB ══ */}
            {tab === "projects" && (
              <div>
                {!activeFolderId && (
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 20, color: T.text }}>Projects</div>

                    {folders.length === 0 && !showNewFolder && (
                      <div style={{ textAlign: "center", padding: "64px 0 32px", color: T.textMuted }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>📁</div>
                        <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6, color: T.textSub }}>No projects yet</div>
                        <div style={{ fontSize: 15 }}>Create a project to group your songs</div>
                      </div>
                    )}

                    <div style={listCard}>
                      {folders.map((folder, i) => (
                        <div key={folder.id}>
                          {i > 0 && <div style={{ height: 1, background: T.divider, marginLeft: 58 }} />}
                          {editingFolderId === folder.id ? (
                            <div style={{ padding: "14px 16px" }}>
                              <input autoFocus value={editFolderName} onChange={e => setEditFolderName(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveEditFolder(); if (e.key === "Escape") setEditingFolderId(null); }}
                                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${T.accent}`, fontSize: 15, marginBottom: 10, background: T.input, color: T.text }} />
                              <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                                {COLORS.map(c => (
                                  <div key={c} onClick={() => setEditFolderColor(c)} style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", boxShadow: editFolderColor === c ? `0 0 0 2px ${T.card}, 0 0 0 4px ${c}` : "none", transition: "box-shadow 0.15s" }} />
                                ))}
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => setEditingFolderId(null)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.cardAlt, fontSize: 14, color: T.text }}>Cancel</button>
                                <button onClick={saveEditFolder} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: T.accent, fontSize: 14, fontWeight: 600, color: "#fff" }}>Save</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="row press"
                              onClick={() => setActiveFolderId(folder.id)}
                              onDragOver={e => handleSectionDragOver(e, folder.id)}
                              onDragLeave={() => setDropTarget(null)}
                              onDrop={e => { e.stopPropagation(); handleSectionDrop(e, folder.id); }}
                              style={{
                                padding: "13px 16px", display: "flex", alignItems: "center", gap: 12,
                                cursor: "pointer", transition: "background 0.1s",
                                background: dropTarget === folder.id ? folder.color + "14" : undefined,
                              }}
                            >
                              <div style={{ width: 34, height: 34, borderRadius: 9, background: folder.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M1 2.5C1 1.95 1.45 1.5 2 1.5H5.8L7.2 3H14C14.55 3 15 3.45 15 4V11.5C15 12.05 14.55 12.5 14 12.5H2C1.45 12.5 1 12.05 1 11.5V2.5Z" fill="white" fillOpacity="0.9"/></svg>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 16, fontWeight: 500, color: T.text }}>{folder.name}</div>
                                <div style={{ fontSize: 13, color: T.textMuted, marginTop: 1 }}>
                                  {folder.songs.length} {folder.songs.length === 1 ? "song" : "songs"}
                                  {dropTarget === folder.id && <span style={{ color: folder.color, marginLeft: 8, fontWeight: 600 }}>Drop to add →</span>}
                                </div>
                              </div>
                              <button onClick={e => { e.stopPropagation(); setEditingFolderId(folder.id); setEditFolderName(folder.name); setEditFolderColor(folder.color); }}
                                style={{ background: "none", border: "none", color: T.accent, fontSize: 13, padding: "0 6px", opacity: 0.8 }}>Edit</button>
                              <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                                style={{ background: "none", border: "none", color: T.textFaint, fontSize: 22, padding: "0 6px 0 0", lineHeight: 1 }}>×</button>
                              <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><path d="M1 1L5.5 5.5L1 10" stroke="#48484A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {showNewFolder ? (
                      <div style={formCard}>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: T.text }}>New Project</div>
                        <input autoFocus placeholder="Project name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                          style={inputBase} />
                        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                          {COLORS.map(c => <div key={c} onClick={() => setNewFolderColor(c)} style={{ width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer", boxShadow: newFolderColor === c ? `0 0 0 3px ${T.card}, 0 0 0 5px ${c}` : "none", transition: "box-shadow 0.15s" }} />)}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => setShowNewFolder(false)} style={btnSecondary}>Cancel</button>
                          <button onClick={createFolder} style={btnPrimary()}>Create</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowNewFolder(true)} className="press" style={dashedBtn()}>
                        + New Project
                      </button>
                    )}
                  </div>
                )}

                {activeFolderId && activeFolder && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: activeFolder.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="18" height="15" viewBox="0 0 18 15" fill="none"><path d="M1 3C1 2.45 1.45 2 2 2H6.5L8 4H16C16.55 4 17 4.45 17 5V12.5C17 13.05 16.55 13.5 16 13.5H2C1.45 13.5 1 13.05 1 12.5V3Z" fill="white" fillOpacity="0.9"/></svg>
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4, color: T.text }}>{activeFolder.name}</div>
                    </div>

                    {activeFolder.songs.length === 0 && (
                      <div style={{ textAlign: "center", padding: "56px 0 28px", color: T.textMuted }}>
                        <div style={{ fontSize: 44, marginBottom: 12 }}>✍️</div>
                        <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6, color: T.textSub }}>No songs yet</div>
                        <div style={{ fontSize: 15 }}>Add your first song below</div>
                      </div>
                    )}

                    <div style={listCard}>
                      {activeFolder.songs.map((song, i) => (
                        <div key={song.id}>
                          {i > 0 && <div style={rowDivider} />}
                          <SongRow song={song} folderName={null} folderColor={activeFolder.color} onClick={() => openSong(song.id, activeFolder.id)} />
                        </div>
                      ))}
                    </div>

                    <button onClick={() => quickCreateSongInFolder(activeFolderId)} className="press" style={dashedBtn(activeFolder.color)}>
                      + New Song
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ══ FLOW LAB TAB ══ */}
            {tab === "flowlab" && (
              <FlowLab onCreateProject={createProjectFromFlow} />
            )}

            {/* ══ MORE TAB ══ */}
            {tab === "more" && (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 20, color: T.text }}>More</div>
                <div style={listCard}>
                  {[
                    { label: "Total songs",        value: allSongs.length },
                    { label: "Projects",           value: folders.length },
                    { label: "Unassigned songs",   value: unassigned.length },
                    { label: "Songs with lyrics",  value: allSongs.filter(({ song }) => song.lyrics?.trim()).length },
                    { label: "Songs with audio",   value: allSongs.filter(({ song }) => song.files?.some(f => f.type?.startsWith("audio/"))).length },
                    { label: "Archived songs",     value: archived.length },
                  ].map(({ label, value }, i) => (
                    <div key={label}>
                      {i > 0 && <div style={{ height: 1, background: T.divider, marginLeft: 16 }} />}
                      <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 15, color: T.text }}>{label}</span>
                        <span style={{ fontSize: 15, color: T.textMuted, fontWeight: 500 }}>{value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SoundCloud */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 12 }}>SoundCloud</div>
                  {soundcloudProfile?.verified ? (
                    <div style={{ ...listCard, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 22 }}>🎧</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{soundcloudProfile.username || soundcloudProfile.url}</div>
                        <a href={`https://${soundcloudProfile.url}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 13, color: T.accent, textDecoration: "none" }}>{soundcloudProfile.url}</a>
                      </div>
                      <button onClick={scDisconnect}
                        style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, color: T.textMuted, fontSize: 13, padding: "6px 12px" }}>
                        Disconnect
                      </button>
                    </div>
                  ) : scCodeSent ? (
                    <div style={listCard}>
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 12 }}>
                          A 6-digit code was sent to your email. Enter it below to verify ownership of <strong style={{ color: T.text }}>{scInput}</strong>.
                        </div>
                        <input
                          autoFocus
                          placeholder="6-digit code"
                          value={scCode}
                          onChange={e => { setScCode(e.target.value); setScError(null); }}
                          onKeyDown={e => { if (e.key === "Enter") scVerify(); }}
                          maxLength={6}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 16, letterSpacing: 6, background: T.input, color: T.text, marginBottom: 10 }}
                        />
                        {scError && <div style={{ fontSize: 13, color: T.danger, marginBottom: 10 }}>{scError}</div>}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setScCodeSent(false); setScCode(""); setScError(null); }}
                            style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.cardAlt, fontSize: 14, color: T.text }}>Back</button>
                          <button onClick={scVerify} disabled={scVerifying || scCode.length < 6}
                            style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: T.accent, fontSize: 14, fontWeight: 600, color: "#fff", opacity: (scVerifying || scCode.length < 6) ? 0.5 : 1 }}>
                            {scVerifying ? "Verifying…" : "Verify"}
                          </button>
                        </div>
                        <button onClick={scSendCode} style={{ background: "none", border: "none", color: T.accent, fontSize: 13, marginTop: 10, padding: 0 }}>
                          Resend code
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={listCard}>
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 12 }}>
                          Enter your SoundCloud profile URL. A verification code will be sent to your email.
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            placeholder="soundcloud.com/yourname"
                            value={scInput}
                            onChange={e => { setScInput(e.target.value); setScError(null); }}
                            onKeyDown={e => { if (e.key === "Enter") scSendCode(); }}
                            style={{ flex: 1, padding: "10px 12px", borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 15, background: T.input, color: T.text }}
                          />
                          <button onClick={scSendCode} disabled={scSending || !scInput.trim()}
                            style={{ padding: "10px 16px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", fontSize: 15, fontWeight: 600, opacity: (scSending || !scInput.trim()) ? 0.5 : 1 }}>
                            {scSending ? "…" : "Send Code"}
                          </button>
                        </div>
                        {scError && <div style={{ fontSize: 13, color: T.danger, marginTop: 8 }}>{scError}</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Find Users */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 12 }}>Find Users</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                      placeholder="Search by username..."
                      value={userQuery}
                      onChange={e => { setUserQuery(e.target.value); setUserResults(null); }}
                      onKeyDown={e => { if (e.key === "Enter") searchUsers(); }}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 15, background: T.input, color: T.text, outline: "none", fontFamily: "inherit" }}
                    />
                    <button
                      onClick={searchUsers}
                      disabled={userSearching || !userQuery.trim()}
                      style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 15, fontWeight: 600, opacity: (userSearching || !userQuery.trim()) ? 0.5 : 1, cursor: (userSearching || !userQuery.trim()) ? "not-allowed" : "pointer" }}>
                      {userSearching ? "…" : "Search"}
                    </button>
                  </div>
                  {userResults !== null && (
                    <div style={listCard}>
                      {userResults.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", color: T.textMuted, fontSize: 15 }}>No users found</div>
                      ) : userResults.map((u, i) => (
                        <div key={u.id}>
                          {i > 0 && <div style={{ height: 1, background: T.divider, marginLeft: 54 }} />}
                          <div style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.accent + "30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16, fontWeight: 700, color: T.accent }}>
                              {(u.username || u.email)?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>{u.username || "—"}</div>
                              <div style={{ fontSize: 13, color: T.textMuted }}>{u.email}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 24 }}>
                  <button
                    onClick={() => { if (confirm("Clear ALL data? This cannot be undone.")) { setState({ folders: [], unassigned: [], archived: [], soundcloudProfile: null }); setScInput(""); setScCodeSent(false); setScCode(""); setScError(null); setActiveFolderId(null); setActiveSongId(null); setActiveSongContext(null); } }}
                    style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: T.card, fontSize: 15, color: T.danger, fontWeight: 500, boxShadow: T.shadow }}>
                    Clear All Data
                  </button>
                </div>
              </div>
            )}
          </>
        )}
          </div>
          </div>
        </div>
      </div>

      {/* Floating quick-create button */}
      {!activeSong && (
        <button
          onClick={quickCreateSong}
          title="New song"
          style={{
            position: "fixed", bottom: 84, right: 20,
            width: 56, height: 56, borderRadius: "50%",
            background: T.accent, border: "none", color: "#fff",
            fontSize: 28, fontWeight: 300, lineHeight: 1,
            boxShadow: "0 4px 20px rgba(10,132,255,0.45)",
            cursor: "pointer", zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.15s, opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          +
        </button>
      )}
    </div>
  );
}
