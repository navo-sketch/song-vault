const T = {
  bg: "#0F0F11", card: "#1C1C1E", cardAlt: "#2C2C2E",
  border: "#3A3A3C", text: "#F2F2F7", textSub: "#EBEBF5CC",
  textMuted: "#98989D", textFaint: "#48484A",
  accent: "#0A84FF", green: "#30D158", orange: "#FF9F0A", purple: "#BF5AF2",
  shadow: "0 1px 6px rgba(0,0,0,0.5)", shadowLg: "0 4px 24px rgba(0,0,0,0.6)",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function FeatureCard({ icon, color, title, points }) {
  return (
    <div style={{
      background: T.card, borderRadius: 18, padding: "24px 22px",
      boxShadow: T.shadowLg, border: `1px solid ${T.border}`, flex: "1 1 260px",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, background: color + "22",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, marginBottom: 16,
      }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 10 }}>{title}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {points.map((p, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <span style={{ color: color, fontSize: 13, marginTop: 2, flexShrink: 0 }}>✦</span>
            <span style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.55 }}>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatPill({ value, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

export default function LandingPage({ onGetStarted, onSignIn }) {
  return (
    <div style={{
      minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: FONT,
      overflowY: "auto", overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .lp-btn-primary {
          background: #0A84FF; color: #fff; border: none; border-radius: 12px;
          font-size: 16px; font-weight: 600; padding: 14px 32px; cursor: pointer;
          font-family: inherit; transition: opacity 0.15s, transform 0.1s;
        }
        .lp-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .lp-btn-ghost {
          background: none; color: #98989D; border: 1px solid #3A3A3C; border-radius: 12px;
          font-size: 16px; font-weight: 500; padding: 14px 32px; cursor: pointer;
          font-family: inherit; transition: color 0.15s, border-color 0.15s;
        }
        .lp-btn-ghost:hover { color: #F2F2F7; border-color: #98989D; }
        .lp-tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: #0A84FF18; color: #0A84FF; border: 1px solid #0A84FF40;
          border-radius: 20px; font-size: 12px; font-weight: 600;
          padding: 5px 12px; letter-spacing: 0.3px; text-transform: uppercase;
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px", borderBottom: `1px solid ${T.border}`,
        position: "sticky", top: 0, background: T.bg + "ee",
        backdropFilter: "blur(12px)", zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎵</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>Song Vault</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="lp-btn-ghost" onClick={onSignIn}
            style={{ padding: "9px 20px", fontSize: 14 }}>Sign In</button>
          <button className="lp-btn-primary" onClick={onGetStarted}
            style={{ padding: "9px 20px", fontSize: 14 }}>Get Started</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "72px 24px 64px", maxWidth: 680, margin: "0 auto" }}>
        <div className="lp-tag" style={{ marginBottom: 24 }}>
          <span>🔐</span> Secure · Private · Built for musicians
        </div>
        <h1 style={{
          fontSize: "clamp(36px, 8vw, 62px)", fontWeight: 800, letterSpacing: -2,
          color: T.text, lineHeight: 1.08, marginBottom: 20,
        }}>
          Your songs,{" "}
          <span style={{
            background: "linear-gradient(135deg, #0A84FF, #BF5AF2)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            secured.
          </span>
        </h1>
        <p style={{ fontSize: 18, color: T.textMuted, lineHeight: 1.7, marginBottom: 36, maxWidth: 520, margin: "0 auto 36px" }}>
          Every riff, lyric, and beat — stored safely in your personal vault.
          Collaborate with confidence. Never lose a song idea again.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="lp-btn-primary" onClick={onGetStarted}
            style={{ fontSize: 16, padding: "15px 36px" }}>
            Create Free Vault
          </button>
          <button className="lp-btn-ghost" onClick={onSignIn}
            style={{ fontSize: 16, padding: "15px 36px" }}>
            Enter Vault Keys
          </button>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{
        maxWidth: 560, margin: "0 auto 72px",
        display: "flex", justifyContent: "space-around", alignItems: "center",
        background: T.card, borderRadius: 18, padding: "28px 32px",
        boxShadow: T.shadowLg, border: `1px solid ${T.border}`,
      }}>
        <StatPill value="100%" label="Private" />
        <div style={{ width: 1, height: 36, background: T.border }} />
        <StatPill value="0" label="Data sold" />
        <div style={{ width: 1, height: 36, background: T.border }} />
        <StatPill value="∞" label="Song ideas" />
        <div style={{ width: 1, height: 36, background: T.border }} />
        <StatPill value="24/7" label="Access" />
      </div>

      {/* ── Why Song Vault ── */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="lp-tag" style={{ marginBottom: 16 }}>Why Song Vault?</div>
          <h2 style={{ fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 800, letterSpacing: -1, color: T.text }}>
            Everything a songwriter needs
          </h2>
          <p style={{ fontSize: 16, color: T.textMuted, marginTop: 12 }}>
            Without the bloat, the price tag, or the privacy compromises.
          </p>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FeatureCard
            icon="🔐"
            color={T.accent}
            title="Security you can trust"
            points={[
              "JWT-authenticated sessions — only you can open your vault",
              "All data travels over HTTPS, encrypted in transit",
              "Tokens expire automatically; no stale access",
              "Your vault stays private by default — nothing is public unless you share it",
            ]}
          />
          <FeatureCard
            icon="🤝"
            color={T.green}
            title="Collaboration made easy"
            points={[
              "Search other artists by username and connect directly",
              "Add credits to every song — Producer, Co-writer, Mixer, you name it",
              "Organize joint work into shared projects with colour-coded folders",
              "Full edit history synced to the cloud so nothing gets lost",
            ]}
          />
          <FeatureCard
            icon="🎵"
            color={T.purple}
            title="Built around the music"
            points={[
              "Lyrics editor, notes, status tracking (Idea → In Progress → Done)",
              "Attach audio files with a built-in player — hear it while you write",
              "Link references, inspirations, and stems directly to a song",
              "Works on every device — phone in the studio, laptop at home",
            ]}
          />
        </div>
      </section>

      {/* ── Security deep-dive ── */}
      <section style={{
        background: T.card, borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`, padding: "64px 24px",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 48, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <div className="lp-tag" style={{ marginBottom: 16 }}>Security</div>
              <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, letterSpacing: -0.8, color: T.text, marginBottom: 16 }}>
                Your vault is yours alone
              </h2>
              <p style={{ fontSize: 15, color: T.textMuted, lineHeight: 1.75, marginBottom: 20 }}>
                Song Vault uses industry-standard JWT authentication. When you log in,
                you receive a signed token that proves your identity without ever exposing
                your password. Tokens are short-lived and checked on every request —
                so even if one somehow leaked, it would expire quickly.
              </p>
              <p style={{ fontSize: 15, color: T.textMuted, lineHeight: 1.75 }}>
                Your vault data is stored on your account only. No other user can read,
                write, or list your songs — the API enforces ownership at the server level,
                not just in the UI.
              </p>
            </div>
            <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "🛡", label: "JWT Auth", desc: "Signed, expiring tokens on every request" },
                { icon: "🔒", label: "HTTPS only", desc: "All traffic encrypted in transit" },
                { icon: "👤", label: "Ownership enforced", desc: "Server-level access control, not just UI" },
                { icon: "⏱", label: "Auto-expiry", desc: "Sessions expire — stale tokens are rejected" },
              ].map(({ icon, label, desc }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: T.cardAlt, borderRadius: 12, padding: "12px 16px",
                  border: `1px solid ${T.border}`,
                }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{label}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Collaboration deep-dive ── */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px" }}>
        <div className="lp-tag" style={{ marginBottom: 16 }}>Collaboration</div>
        <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, letterSpacing: -0.8, color: T.text, marginBottom: 16 }}>
          Write together, stay organised
        </h2>
        <p style={{ fontSize: 15, color: T.textMuted, lineHeight: 1.75, marginBottom: 40 }}>
          Music is rarely made alone. Song Vault is built with that in mind —
          from crediting every contributor to finding the right collaborator by username.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            {
              step: "01", color: T.accent,
              title: "Find artists",
              desc: "Search any username directly from the More tab. No social graph required — just a name and a connection.",
            },
            {
              step: "02", color: T.green,
              title: "Credit everyone",
              desc: "Every song has a Credits section. Add names and roles — producer, co-writer, mixer, featured artist — so the record is always clear.",
            },
            {
              step: "03", color: T.purple,
              title: "Organise by project",
              desc: "Group songs into colour-coded projects. Assign any song to a project in one tap, even if it started as a solo idea.",
            },
          ].map(({ step, color, title, desc }) => (
            <div key={step} style={{
              flex: "1 1 200px", background: T.card, borderRadius: 16,
              padding: "22px 20px", border: `1px solid ${T.border}`, boxShadow: T.shadow,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                Step {step}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA footer ── */}
      <section style={{
        textAlign: "center", padding: "64px 24px 72px",
        background: T.card, borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎵</div>
        <h2 style={{ fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 800, letterSpacing: -0.8, color: T.text, marginBottom: 14 }}>
          Ready to open your vault?
        </h2>
        <p style={{ fontSize: 16, color: T.textMuted, marginBottom: 32, maxWidth: 400, margin: "0 auto 32px" }}>
          Free to use. No credit card. Your songs stay yours.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="lp-btn-primary" onClick={onGetStarted}
            style={{ fontSize: 16, padding: "15px 36px" }}>
            Create Free Vault
          </button>
          <button className="lp-btn-ghost" onClick={onSignIn}
            style={{ fontSize: 16, padding: "15px 36px" }}>
            Sign In
          </button>
        </div>
      </section>
    </div>
  );
}
