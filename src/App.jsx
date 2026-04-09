// ============================================================
// Song Vault — full rewrite
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
// ============================================================

import { useState, useRef, useEffect } from "react";

const COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF2D55", "#AF52DE", "#FF3B30", "#5AC8FA", "#FFCC00"];
const STORAGE_KEY = "song-vault-v1";

function genId() { return Math.random().toString(36).slice(2, 9); }

// ---------- persistence ----------
function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return { folders: [], unassigned: [] };
    const parsed = JSON.parse(s);
    // migrate old format that didn't have unassigned
    return { folders: parsed.folders || [], unassigned: parsed.unassigned || [] };
  } catch { return { folders: [], unassigned: [] }; }
}
function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// ---------- shared style constants ----------
const cardStyle = { background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };
const sectionLabel = { fontSize: 11, fontWeight: 600, color: "#8E8E93", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 };
const Divider = () => <div style={{ height: 1, background: "#F2F2F7", margin: "10px 0" }} />;

const STATUS = {
  idea: { label: "Idea", color: "#8E8E93" },
  wip:  { label: "In Progress", color: "#FF9500" },
  done: { label: "Done", color: "#34C759" },
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
      style: { ...style, border: "1px solid #007AFF", borderRadius: 8, padding: "6px 10px", outline: "none", background: "#fff", width: "100%", resize: multiline ? "vertical" : "none" }
    };
    return multiline ? <textarea {...shared} rows={rows} /> : <input {...shared} />;
  }
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, width: "100%" }}>
      <span style={{ ...style, flex: 1, color: value ? undefined : "#C7C7CC" }}>{value || placeholder}</span>
      <button onClick={() => { setDraft(value); setEditing(true); }}
        style={{ background: "none", border: "none", color: "#007AFF", fontSize: 13, padding: "0 2px", flexShrink: 0, cursor: "pointer", opacity: 0.7 }}>Edit</button>
    </div>
  );
}

// ---------- NEW D: audio player for a single audio file ----------
function AudioPlayer({ file }) {
  // only render for audio mime types
  if (!file || !file.type?.startsWith("audio/")) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <audio controls src={file.dataUrl} style={{ width: "100%", height: 36 }} />
    </div>
  );
}

// ---------- song detail view ----------
function SongDetail({ song, folderId, folders, setFolders, onBack, onDelete }) {
  // FIX 3: guard — if song is somehow undefined, show nothing
  if (!song) return null;

  const [showNewLink, setShowNewLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl]     = useState("");
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [editLinkLabel, setEditLinkLabel] = useState("");
  const [editLinkUrl, setEditLinkUrl]     = useState("");
  const fileInputRef = useRef();

  // update this song regardless of whether it's in a folder or unassigned
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

  // first audio file for the player (NEW D)
  const audioFile = song.files?.find(f => f.type?.startsWith("audio/"));

  return (
    <div>
      {/* Title */}
      <input
        value={song.title}
        onChange={e => updateSong({ title: e.target.value })}
        style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4, background: "none", border: "none", borderBottom: "2px solid transparent", width: "100%", marginBottom: 12, color: "#1C1C1E", padding: "2px 0" }}
        onFocus={e => e.target.style.borderBottomColor = "#007AFF"}
        onBlur={e => e.target.style.borderBottomColor = "transparent"}
      />

      {/* NEW D: audio player shown right below title if audio file exists */}
      {audioFile && (
        <div style={{ marginBottom: 16 }}>
          <AudioPlayer file={audioFile} />
        </div>
      )}

      {/* Status pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {Object.entries(STATUS).map(([key, val]) => (
          <button key={key} onClick={() => updateSong({ status: key })} className="press"
            style={{ padding: "6px 16px", borderRadius: 20, border: "none", fontSize: 14, fontWeight: 500,
              background: song.status === key ? val.color : "#E5E5EA",
              color: song.status === key ? "#fff" : "#8E8E93", transition: "all 0.15s" }}>
            {val.label}
          </button>
        ))}
      </div>

      {/* Notes */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Notes</div>
        <textarea value={song.notes} onChange={e => updateSong({ notes: e.target.value })}
          placeholder="Mood, themes, references, ideas..." rows={3}
          style={{ width: "100%", border: "none", background: "none", fontSize: 15, color: "#1C1C1E", resize: "none", lineHeight: 1.6, padding: 0 }} />
      </div>

      {/* Lyrics */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Lyrics</div>
        <textarea value={song.lyrics} onChange={e => updateSong({ lyrics: e.target.value })}
          placeholder="Start writing..." rows={10}
          style={{ width: "100%", border: "none", background: "none", fontSize: 15, color: "#1C1C1E", resize: "none", lineHeight: 1.9, padding: 0 }} />
      </div>

      {/* Links */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Links</div>
        {song.links?.map((link, i) => (
          <div key={link.id}>
            {i > 0 && <Divider />}
            {editingLinkId === link.id ? (
              <div>
                <input autoFocus value={editLinkLabel} onChange={e => setEditLinkLabel(e.target.value)} placeholder="Label"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #007AFF", fontSize: 14, marginBottom: 7, background: "#F9F9F9" }} />
                <input value={editLinkUrl} onChange={e => setEditLinkUrl(e.target.value)} placeholder="https://..."
                  onKeyDown={e => { if (e.key === "Enter") saveEditLink(); if (e.key === "Escape") setEditingLinkId(null); }}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #E5E5EA", fontSize: 14, marginBottom: 10, background: "#F9F9F9" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setEditingLinkId(null)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid #E5E5EA", background: "#F2F2F7", fontSize: 14 }}>Cancel</button>
                  <button onClick={saveEditLink} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#007AFF", fontSize: 14, fontWeight: 600, color: "#fff" }}>Save</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 17 }}>🔗</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, color: "#007AFF", fontSize: 15, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.label}</a>
                <button onClick={() => { setEditingLinkId(link.id); setEditLinkLabel(link.label); setEditLinkUrl(link.url); }}
                  style={{ background: "none", border: "none", color: "#007AFF", fontSize: 13, opacity: 0.8 }}>Edit</button>
                {/* FIX 1: stopPropagation on remove button */}
                <button onClick={e => { e.stopPropagation(); removeLink(link.id); }}
                  style={{ background: "none", border: "none", color: "#C7C7CC", fontSize: 22, lineHeight: 1 }}>×</button>
              </div>
            )}
          </div>
        ))}
        {song.links?.length > 0 && <Divider />}
        {showNewLink ? (
          <div>
            <input autoFocus placeholder="Label (optional)" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #E5E5EA", fontSize: 14, marginBottom: 7, background: "#F9F9F9" }} />
            <input placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addLink(); if (e.key === "Escape") setShowNewLink(false); }}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #E5E5EA", fontSize: 14, marginBottom: 10, background: "#F9F9F9" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowNewLink(false)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid #E5E5EA", background: "#F2F2F7", fontSize: 14 }}>Cancel</button>
              <button onClick={addLink} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#007AFF", fontSize: 14, fontWeight: 600, color: "#fff" }}>Add</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewLink(true)} style={{ background: "none", border: "none", color: "#007AFF", fontSize: 15, padding: 0 }}>+ Add Link</button>
        )}
      </div>

      {/* Files */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Files</div>
        {song.files?.map((file, i) => (
          <div key={file.id}>
            {i > 0 && <Divider />}
            {/* NEW D: inline audio player per audio file */}
            {file.type?.startsWith("audio/") && <AudioPlayer file={file} />}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: file.type?.startsWith("audio/") ? 6 : 0 }}>
              <span style={{ fontSize: 17 }}>📎</span>
              <EditableText value={file.name} onSave={val => val.trim() && renameFile(file.id, val.trim())}
                placeholder="filename" style={{ flex: 1, fontSize: 14, color: "#1C1C1E" }} />
              <span style={{ fontSize: 12, color: "#C7C7CC", flexShrink: 0 }}>{(file.size / 1024).toFixed(0)} KB</span>
              <a href={file.dataUrl} download={file.name} style={{ color: "#007AFF", fontSize: 13, textDecoration: "none", flexShrink: 0 }}>↓</a>
              {/* FIX 1: stopPropagation on file remove */}
              <button onClick={e => { e.stopPropagation(); removeFile(file.id); }}
                style={{ background: "none", border: "none", color: "#C7C7CC", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
          </div>
        ))}
        {song.files?.length > 0 && <Divider />}
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleFile} />
        <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", color: "#007AFF", fontSize: 15, padding: 0 }}>+ Attach File</button>
      </div>

      {/* Delete song — FIX 1: stopPropagation; FIX 2: onDelete clears state immediately */}
      <button onClick={e => { e.stopPropagation(); onDelete(song.id); }}
        style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#fff", fontSize: 15, color: "#FF3B30", fontWeight: 500, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        Delete Song
      </button>
    </div>
  );
}

// ---------- NEW B: flat song row used in the Songs tab ----------
// Shows title (inline editable), status pill, and taps into detail view
function SongRow({ song, folderName, folderColor, onClick }) {
  const st = STATUS[song.status] || STATUS.idea;
  const audioFile = song.files?.find(f => f.type?.startsWith("audio/"));
  return (
    <div className="row press" onClick={onClick}
      style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "background 0.1s" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: st.color, fontWeight: 500 }}>{st.label}</span>
          {folderName && (
            <span style={{ fontSize: 12, background: (folderColor || "#8E8E93") + "20", color: folderColor || "#8E8E93", borderRadius: 6, padding: "1px 7px" }}>{folderName}</span>
          )}
          {audioFile && <span style={{ fontSize: 12, color: "#C7C7CC" }}>🎵</span>}
          {song.lyrics ? <span style={{ fontSize: 12, color: "#C7C7CC" }}>Lyrics</span> : null}
          {song.links?.length > 0 ? <span style={{ fontSize: 12, color: "#C7C7CC" }}>{song.links.length} link{song.links.length > 1 ? "s" : ""}</span> : null}
        </div>
      </div>
      <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><path d="M1 1L5.5 5.5L1 10" stroke="#C7C7CC" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

// ============================================================
// Main app
// ============================================================
export default function SongVault() {
  const [state, setStateRaw] = useState(loadState);
  // auto-save on every change
  useEffect(() => { saveState(state); }, [state]);

  // helper so we always merge with prev cleanly
  function setState(updater) {
    setStateRaw(prev => typeof updater === "function" ? updater(prev) : { ...prev, ...updater });
  }

  const { folders, unassigned } = state;

  // NEW A: top-level tab: "songs" | "projects" | "more"
  const [tab, setTab] = useState("songs");

  // navigation within a tab
  const [activeFolderId, setActiveFolderId] = useState(null); // null = folder list
  const [activeSongId,   setActiveSongId]   = useState(null); // null = song list
  const [activeSongContext, setActiveSongContext] = useState(null); // "unassigned" | folderId

  // FIX 3: resolve active objects safely
  const activeFolder = folders.find(f => f.id === activeFolderId) ?? null;
  const activeSong = (() => {
    if (!activeSongId) return null;
    if (activeSongContext === "unassigned") return unassigned.find(s => s.id === activeSongId) ?? null;
    const folder = folders.find(f => f.id === activeSongContext);
    return folder?.songs.find(s => s.id === activeSongId) ?? null;
  })();

  // folder form state
  const [showNewFolder,   setShowNewFolder]   = useState(false);
  const [newFolderName,   setNewFolderName]   = useState("");
  const [newFolderColor,  setNewFolderColor]  = useState(COLORS[0]);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editFolderName,  setEditFolderName]  = useState("");
  const [editFolderColor, setEditFolderColor] = useState(COLORS[0]);

  // new song form
  const [showNewSong,  setShowNewSong]  = useState(false);
  const [newSongTitle, setNewSongTitle] = useState("");

  // ---- folder actions ----
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
  // FIX 1+2: stopPropagation handled at call site; state cleared immediately
  function deleteFolder(id) {
    if (!confirm("Delete this folder and all its songs?")) return;
    setState(prev => ({ folders: prev.folders.filter(f => f.id !== id) }));
    // FIX 2: clear navigation state immediately if the active folder was deleted
    if (activeFolderId === id) { setActiveFolderId(null); setActiveSongId(null); setActiveSongContext(null); }
  }

  // ---- song actions ----
  function createSong() {
    if (!newSongTitle.trim()) return;
    const s = { id: genId(), title: newSongTitle.trim(), status: "idea", lyrics: "", notes: "", links: [], files: [] };
    if (activeFolderId) {
      // song goes into the active folder
      setState(prev => ({ folders: prev.folders.map(f => f.id !== activeFolderId ? f : { ...f, songs: [...f.songs, s] }) }));
      setActiveSongContext(activeFolderId);
    } else {
      // NEW C: no active folder → goes to unassigned
      setState(prev => ({ unassigned: [...prev.unassigned, s] }));
      setActiveSongContext("unassigned");
    }
    setActiveSongId(s.id);
    setNewSongTitle(""); setShowNewSong(false);
  }

  // FIX 1+2: delete song clears IDs immediately and uses context
  function deleteSong(id) {
    if (!confirm("Delete this song?")) return;
    if (activeSongContext === "unassigned") {
      setState(prev => ({ unassigned: prev.unassigned.filter(s => s.id !== id) }));
    } else {
      setState(prev => ({ folders: prev.folders.map(f => f.id !== activeSongContext ? f : { ...f, songs: f.songs.filter(s => s.id !== id) }) }));
    }
    // FIX 2: clear immediately so nothing renders a stale song
    setActiveSongId(null);
    setActiveSongContext(null);
  }

  // ---- nav helpers ----
  function openSong(songId, context) {
    setActiveSongId(songId);
    setActiveSongContext(context);
  }
  function backFromSong() {
    setActiveSongId(null);
    setActiveSongContext(null);
  }
  function backFromFolder() {
    setActiveFolderId(null);
    setActiveSongId(null);
    setActiveSongContext(null);
  }

  // ---- collect all songs flat for Songs tab (NEW B) ----
  const allSongs = [
    ...unassigned.map(s => ({ song: s, folderId: "unassigned", folderName: null, folderColor: null })),
    ...folders.flatMap(f => f.songs.map(s => ({ song: s, folderId: f.id, folderName: f.name, folderColor: f.color })))
  ];

  // ---- shared styles ----
  const tabBtn = (active) => ({
    flex: 1, padding: "8px 0", background: "none", border: "none", fontSize: 14, fontWeight: active ? 600 : 400,
    color: active ? "#007AFF" : "#8E8E93", borderBottom: active ? "2px solid #007AFF" : "2px solid transparent",
    cursor: "pointer", transition: "all 0.15s"
  });

  // ---- nav bar title / back button ----
  function NavBar() {
    if (activeSong) {
      // back to song list or folder depending on context
      const backLabel = activeSongContext === "unassigned"
        ? "Songs"
        : (folders.find(f => f.id === activeSongContext)?.name ?? "Back");
      return (
        <>
          <button onClick={backFromSong} style={{ background: "none", border: "none", color: "#007AFF", fontSize: 16, display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L1.5 7.5L7.5 13.5" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {backLabel}
          </button>
          <div style={{ flex: 1 }} />
          {/* FIX 1: stopPropagation on nav-bar delete */}
          <button onClick={e => { e.stopPropagation(); deleteSong(activeSong.id); }}
            style={{ background: "none", border: "none", color: "#FF3B30", fontSize: 15 }}>Delete</button>
        </>
      );
    }
    if (tab === "projects" && activeFolderId) {
      return (
        <button onClick={backFromFolder} style={{ background: "none", border: "none", color: "#007AFF", fontSize: 16, display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M7.5 1.5L1.5 7.5L7.5 13.5" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Projects
        </button>
      );
    }
    return <span style={{ fontSize: 17, fontWeight: 600 }}>Song Vault</span>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7", fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif", color: "#1C1C1E" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; font-family: inherit; }
        input, textarea { font-family: inherit; }
        textarea:focus, input:focus { outline: none; }
        .row:hover { background: #F9F9FB !important; }
        .press:active { opacity: 0.7; }
        audio { border-radius: 8px; }
      `}</style>

      {/* ── Nav bar ── */}
      <div style={{ background: "rgba(242,242,247,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "0 20px", height: 52, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <NavBar />
      </div>

      {/* NEW A: tab bar — only show when not inside a song detail */}
      {!activeSong && (
        <div style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", padding: "0 20px", position: "sticky", top: 52, zIndex: 9 }}>
          {[["songs", "Songs"], ["projects", "Projects"], ["more", "More"]].map(([key, label]) => (
            <button key={key} style={tabBtn(tab === key)} onClick={() => { setTab(key); setActiveFolderId(null); setActiveSongId(null); setActiveSongContext(null); }}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 48px" }}>

        {/* ── SONG DETAIL (shared across tabs) ── */}
        {/* FIX 3: only render if activeSong is non-null */}
        {activeSong ? (
          <SongDetail
            song={activeSong}
            folderId={activeSongContext}
            folders={state}
            setFolders={setState}
            onBack={backFromSong}
            onDelete={deleteSong}
          />
        ) : (

          <>
            {/* ══════════ SONGS TAB (NEW B) ══════════ */}
            {tab === "songs" && (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 20 }}>All Songs</div>

                {allSongs.length === 0 && !showNewSong && (
                  <div style={{ textAlign: "center", padding: "60px 0 30px", color: "#8E8E93" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
                    <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6, color: "#3C3C43" }}>No songs yet</div>
                    <div style={{ fontSize: 15 }}>Tap below to add your first song</div>
                  </div>
                )}

                {/* NEW C: unassigned section */}
                {unassigned.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#8E8E93", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6, paddingLeft: 4 }}>Unassigned</div>
                    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                      {unassigned.map((song, i) => (
                        <div key={song.id}>
                          {i > 0 && <div style={{ height: 1, background: "#F2F2F7", marginLeft: 16 }} />}
                          <SongRow song={song} folderName={null} folderColor={null} onClick={() => openSong(song.id, "unassigned")} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* songs inside folders, grouped */}
                {folders.filter(f => f.songs.length > 0).map(folder => (
                  <div key={folder.id} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: folder.color, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 6, paddingLeft: 4 }}>{folder.name}</div>
                    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                      {folder.songs.map((song, i) => (
                        <div key={song.id}>
                          {i > 0 && <div style={{ height: 1, background: "#F2F2F7", marginLeft: 16 }} />}
                          <SongRow song={song} folderName={folder.name} folderColor={folder.color} onClick={() => openSong(song.id, folder.id)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* New song form — songs tab creates unassigned by default (NEW C) */}
                {showNewSong ? (
                  <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>New Song</div>
                    <input autoFocus placeholder="Song title" value={newSongTitle} onChange={e => setNewSongTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") createSong(); if (e.key === "Escape") setShowNewSong(false); }}
                      style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #E5E5EA", fontSize: 16, marginBottom: 12, background: "#F9F9F9", color: "#1C1C1E" }} />
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => setShowNewSong(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #E5E5EA", background: "#F2F2F7", fontSize: 15, fontWeight: 500 }}>Cancel</button>
                      <button onClick={createSong} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "#007AFF", fontSize: 15, fontWeight: 600, color: "#fff" }}>Add Song</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setActiveFolderId(null); setShowNewSong(true); }} className="press"
                    style={{ width: "100%", padding: "14px", borderRadius: 12, border: "2px dashed #C7C7CC", background: "transparent", fontSize: 15, color: "#007AFF", fontWeight: 500 }}>
                    + New Song
                  </button>
                )}
              </div>
            )}

            {/* ══════════ PROJECTS TAB ══════════ */}
            {tab === "projects" && (
              <div>
                {/* ── Project folder list ── */}
                {!activeFolderId && (
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 20 }}>Projects</div>

                    {folders.length === 0 && !showNewFolder && (
                      <div style={{ textAlign: "center", padding: "64px 0 32px", color: "#8E8E93" }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>📁</div>
                        <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6, color: "#3C3C43" }}>No projects yet</div>
                        <div style={{ fontSize: 15 }}>Create a project to group your songs</div>
                      </div>
                    )}

                    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 16 }}>
                      {folders.map((folder, i) => (
                        <div key={folder.id}>
                          {i > 0 && <div style={{ height: 1, background: "#F2F2F7", marginLeft: 58 }} />}
                          {editingFolderId === folder.id ? (
                            <div style={{ padding: "14px 16px" }}>
                              <input autoFocus value={editFolderName} onChange={e => setEditFolderName(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveEditFolder(); if (e.key === "Escape") setEditingFolderId(null); }}
                                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #007AFF", fontSize: 15, marginBottom: 10, background: "#F9F9F9" }} />
                              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                                {COLORS.map(c => (
                                  <div key={c} onClick={() => setEditFolderColor(c)} style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", boxShadow: editFolderColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none", transition: "box-shadow 0.15s" }} />
                                ))}
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => setEditingFolderId(null)} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid #E5E5EA", background: "#F2F2F7", fontSize: 14 }}>Cancel</button>
                                <button onClick={saveEditFolder} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: "#007AFF", fontSize: 14, fontWeight: 600, color: "#fff" }}>Save</button>
                              </div>
                            </div>
                          ) : (
                            <div className="row press" onClick={() => setActiveFolderId(folder.id)}
                              style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "background 0.1s" }}>
                              <div style={{ width: 34, height: 34, borderRadius: 9, background: folder.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg width="16" height="14" viewBox="0 0 16 14" fill="none"><path d="M1 2.5C1 1.95 1.45 1.5 2 1.5H5.8L7.2 3H14C14.55 3 15 3.45 15 4V11.5C15 12.05 14.55 12.5 14 12.5H2C1.45 12.5 1 12.05 1 11.5V2.5Z" fill="white" fillOpacity="0.9"/></svg>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 16, fontWeight: 500 }}>{folder.name}</div>
                                <div style={{ fontSize: 13, color: "#8E8E93", marginTop: 1 }}>{folder.songs.length} {folder.songs.length === 1 ? "song" : "songs"}</div>
                              </div>
                              {/* FIX 1: stopPropagation on edit and delete buttons */}
                              <button onClick={e => { e.stopPropagation(); setEditingFolderId(folder.id); setEditFolderName(folder.name); setEditFolderColor(folder.color); }}
                                style={{ background: "none", border: "none", color: "#007AFF", fontSize: 13, padding: "0 6px", opacity: 0.8 }}>Edit</button>
                              <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                                style={{ background: "none", border: "none", color: "#C7C7CC", fontSize: 22, padding: "0 6px 0 0", lineHeight: 1 }}>×</button>
                              <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><path d="M1 1L5.5 5.5L1 10" stroke="#C7C7CC" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {showNewFolder ? (
                      <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>New Project</div>
                        <input autoFocus placeholder="Project name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                          style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #E5E5EA", fontSize: 16, marginBottom: 14, background: "#F9F9F9", color: "#1C1C1E" }} />
                        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                          {COLORS.map(c => <div key={c} onClick={() => setNewFolderColor(c)} style={{ width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer", boxShadow: newFolderColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : "none", transition: "box-shadow 0.15s" }} />)}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => setShowNewFolder(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #E5E5EA", background: "#F2F2F7", fontSize: 15, fontWeight: 500 }}>Cancel</button>
                          <button onClick={createFolder} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "#007AFF", fontSize: 15, fontWeight: 600, color: "#fff" }}>Create</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowNewFolder(true)} className="press"
                        style={{ width: "100%", padding: "14px", borderRadius: 12, border: "2px dashed #C7C7CC", background: "transparent", fontSize: 15, color: "#007AFF", fontWeight: 500 }}>
                        + New Project
                      </button>
                    )}
                  </div>
                )}

                {/* ── Song list inside a folder (Projects tab) ── */}
                {/* FIX 3: only render if activeFolder is non-null */}
                {activeFolderId && activeFolder && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: activeFolder.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="18" height="15" viewBox="0 0 18 15" fill="none"><path d="M1 3C1 2.45 1.45 2 2 2H6.5L8 4H16C16.55 4 17 4.45 17 5V12.5C17 13.05 16.55 13.5 16 13.5H2C1.45 13.5 1 13.05 1 12.5V3Z" fill="white" fillOpacity="0.9"/></svg>
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4 }}>{activeFolder.name}</div>
                    </div>

                    {activeFolder.songs.length === 0 && !showNewSong && (
                      <div style={{ textAlign: "center", padding: "56px 0 28px", color: "#8E8E93" }}>
                        <div style={{ fontSize: 44, marginBottom: 12 }}>✍️</div>
                        <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6, color: "#3C3C43" }}>No songs yet</div>
                        <div style={{ fontSize: 15 }}>Add your first song below</div>
                      </div>
                    )}

                    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 16 }}>
                      {activeFolder.songs.map((song, i) => (
                        <div key={song.id}>
                          {i > 0 && <div style={{ height: 1, background: "#F2F2F7", marginLeft: 16 }} />}
                          <SongRow song={song} folderName={null} folderColor={activeFolder.color} onClick={() => openSong(song.id, activeFolder.id)} />
                        </div>
                      ))}
                    </div>

                    {showNewSong ? (
                      <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>New Song</div>
                        <input autoFocus placeholder="Song title" value={newSongTitle} onChange={e => setNewSongTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") createSong(); if (e.key === "Escape") setShowNewSong(false); }}
                          style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #E5E5EA", fontSize: 16, marginBottom: 12, background: "#F9F9F9", color: "#1C1C1E" }} />
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => setShowNewSong(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #E5E5EA", background: "#F2F2F7", fontSize: 15, fontWeight: 500 }}>Cancel</button>
                          <button onClick={createSong} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: activeFolder.color, fontSize: 15, fontWeight: 600, color: "#fff" }}>Add Song</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowNewSong(true)} className="press"
                        style={{ width: "100%", padding: "14px", borderRadius: 12, border: "2px dashed #C7C7CC", background: "transparent", fontSize: 15, color: activeFolder.color, fontWeight: 500 }}>
                        + New Song
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ MORE TAB ══════════ */}
            {tab === "more" && (
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginBottom: 20 }}>More</div>
                <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  {[
                    { label: "Total songs", value: allSongs.length },
                    { label: "Projects", value: folders.length },
                    { label: "Unassigned songs", value: unassigned.length },
                    { label: "Songs with lyrics", value: allSongs.filter(({ song }) => song.lyrics?.trim()).length },
                    { label: "Songs with audio", value: allSongs.filter(({ song }) => song.files?.some(f => f.type?.startsWith("audio/"))).length },
                  ].map(({ label, value }, i, arr) => (
                    <div key={label}>
                      {i > 0 && <div style={{ height: 1, background: "#F2F2F7", marginLeft: 16 }} />}
                      <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 15 }}>{label}</span>
                        <span style={{ fontSize: 15, color: "#8E8E93", fontWeight: 500 }}>{value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 24 }}>
                  <button
                    onClick={() => { if (confirm("Clear ALL data? This cannot be undone.")) { setState({ folders: [], unassigned: [] }); setActiveFolderId(null); setActiveSongId(null); setActiveSongContext(null); } }}
                    style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#fff", fontSize: 15, color: "#FF3B30", fontWeight: 500, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                    Clear All Data
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
