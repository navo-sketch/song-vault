import { useState } from "react";
import { supabase } from "./supabaseClient";

const T = {
  bg: "#0F0F11", card: "#1C1C1E", input: "#2C2C2E",
  border: "#3A3A3C", text: "#F2F2F7", textMuted: "#98989D",
  accent: "#0A84FF", danger: "#FF453A",
};

export default function AuthScreen() {
  const [mode, setMode]         = useState("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() || email.split("@")[0] } },
      });
      if (error) setError(error.message);
      else setDone(true);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
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
        input:focus { border-color: #0A84FF !important; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎵</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>Song Vault</div>
          <div style={{ fontSize: 14, color: T.textMuted, marginTop: 6 }}>
            {mode === "login" ? "Sign in to your vault" : "Create your vault"}
          </div>
        </div>

        {done ? (
          /* Confirm email state */
          <div style={{ background: T.card, borderRadius: 16, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 14 }}>📬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 8 }}>Check your email</div>
            <div style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.6 }}>
              We sent a confirmation link to{" "}
              <span style={{ color: T.text, fontWeight: 500 }}>{email}</span>.
              Click it then come back to sign in.
            </div>
            <button onClick={() => { setMode("login"); setDone(false); }} style={{ ...btnStyle, marginTop: 20 }}>
              Back to Sign In
            </button>
          </div>
        ) : (
          /* Login / Signup form */
          <form onSubmit={handleSubmit} style={{ background: T.card, borderRadius: 16, padding: 24 }}>
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Display name (optional)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={inputStyle}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom: error ? 10 : 16 }}
            />

            {error && (
              <div style={{ fontSize: 13, color: T.danger, marginBottom: 14, textAlign: "center", lineHeight: 1.4 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: T.textMuted }}>
              {mode === "login" ? (
                <>No account?{" "}
                  <button type="button" onClick={() => { setMode("signup"); setError(null); }} style={linkBtn}>
                    Sign up free
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button type="button" onClick={() => { setMode("login"); setError(null); }} style={linkBtn}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
