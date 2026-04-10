import { useState } from "react";
import { apiLogin, apiSignup } from "./api";
import MusicNoteKeyhole from "./Logo";

const T = {
  bg: "#0F0F11", card: "#1C1C1E", input: "#2C2C2E",
  border: "#3A3A3C", text: "#F2F2F7", textMuted: "#98989D",
  accent: "#0A84FF", danger: "#FF453A",
};

export default function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = mode === "signup"
      ? await apiSignup(email, password, username)
      : await apiLogin(email, password);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onAuth(res.user);
  }

  function switchMode(newMode) {
    setIsTransitioning(true);
    setError(null);
    setTimeout(() => {
      setMode(newMode);
      setIsTransitioning(false);
    }, 150);
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${T.border}`, fontSize: 15, marginBottom: 12,
    background: T.input, color: T.text, outline: "none", fontFamily: "inherit",
  };
  const btnStyle = {
    width: "100%", padding: "13px", borderRadius: 10, border: "none",
    background: T.accent, fontSize: 15, fontWeight: 600, color: "#fff",
    cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
    fontFamily: "inherit",
  };
  const linkBtn = {
    background: "none", border: "none", color: T.accent,
    fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", alignItems: "center",
      justifyContent: "center", background: T.bg, padding: 20,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #48484A; }
        input:focus { border-color: #0A84FF !important; outline: none; }
        input { transition: border-color 0.2s; }
        button { transition: all 0.2s; }
        .auth-form { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fading { opacity: 0; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32, animation: "slideUp 0.4s ease-out" }}>
          <MusicNoteKeyhole size={56} color={T.accent} />
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: -0.7, marginTop: 14 }}>LyricLab</div>
          <div style={{ fontSize: 14, color: T.textMuted, marginTop: 8 }}>
            {mode === "login" ? "Sign in and keep writing" : "Create your songwriting lab"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className={isTransitioning ? "fading" : "auth-form"} style={{ background: T.card, borderRadius: 16, padding: 24, transition: "opacity 0.15s" }}>
          {mode === "signup" && (
            <input type="text" placeholder="Display name (optional)"
              value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
          )}
          <input type="email" placeholder="Email" autoFocus required
            value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Password" required minLength={6}
            value={password} onChange={e => setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: error ? 10 : 16 }} />

          {error && (
            <div style={{ fontSize: 13, color: T.danger, marginBottom: 14, textAlign: "center", animation: "slideUp 0.2s ease-out" }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{...btnStyle, cursor: loading ? "not-allowed" : "pointer"}}>
            {loading ? "Loading…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: T.textMuted }}>
            {mode === "login" ? (
              <>No account?{" "}
                <button type="button" onClick={() => switchMode("signup")} style={linkBtn}>
                  Create one free
                </button></>
            ) : (
              <>Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")} style={linkBtn}>
                  Sign in
                </button></>
            )}
          </div>
        </form>

        <button onClick={() => onAuth({ id: "guest", username: "Guest", isGuest: true })} style={{
          width: "100%", marginTop: 12, padding: "12px", borderRadius: 10,
          border: `1px solid ${T.border}`, background: "none",
          fontSize: 14, fontWeight: 500, color: T.textMuted,
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s"
        }} onMouseEnter={e => { e.target.style.borderColor = T.textMuted; e.target.style.color = T.text; }}
           onMouseLeave={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textMuted; }}>
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
