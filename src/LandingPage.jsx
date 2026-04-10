import MusicNoteKeyhole from "./Logo";

const T = {
  bg: "#0F0F11", card: "#1C1C1E", cardAlt: "#2C2C2E",
  border: "#3A3A3C", text: "#F2F2F7", textSub: "#EBEBF5CC",
  textMuted: "#98989D", textFaint: "#48484A",
  accent: "#0A84FF", green: "#30D158", orange: "#FF9F0A", purple: "#BF5AF2",
  shadow: "0 1px 6px rgba(0,0,0,0.5)", shadowLg: "0 4px 24px rgba(0,0,0,0.6)",
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function StepCard({ number, color, icon, title, desc }) {
  return (
    <div style={{
      flex: "1 1 200px", background: T.card, borderRadius: 18,
      padding: "24px 20px", border: `1px solid ${T.border}`,
      boxShadow: T.shadowLg, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 16, right: 18,
        fontSize: 42, fontWeight: 800, color: color + "18", lineHeight: 1,
        letterSpacing: -2, userSelect: "none",
      }}>{number}</div>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: color + "22", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 20, marginBottom: 14,
      }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
}

function QuoteCard({ quote, name, role, color }) {
  return (
    <div style={{
      flex: "1 1 260px", background: T.card, borderRadius: 18,
      padding: "24px 22px", border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${color}`, boxShadow: T.shadowLg,
    }}>
      <div style={{ fontSize: 28, color: color, lineHeight: 1, marginBottom: 12, fontFamily: "Georgia, serif" }}>"</div>
      <p style={{ fontSize: 15, color: T.textSub, lineHeight: 1.75, marginBottom: 18, fontStyle: "italic" }}>{quote}</p>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{name}</div>
      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{role}</div>
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
          <MusicNoteKeyhole size={28} color={T.accent} />
          <span style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>LyricLab</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="lp-btn-ghost" onClick={onSignIn}
            style={{ padding: "9px 20px", fontSize: 14 }}>Sign In</button>
          <button className="lp-btn-primary" onClick={onGetStarted}
            style={{ padding: "9px 20px", fontSize: 14 }}>Start Writing</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "80px 24px 72px", maxWidth: 700, margin: "0 auto" }}>
        <div className="lp-tag" style={{ marginBottom: 28 }}>
          ✍️ Made for songwriters
        </div>
        <h1 style={{
          fontSize: "clamp(38px, 8vw, 66px)", fontWeight: 800, letterSpacing: -2.5,
          color: T.text, lineHeight: 1.05, marginBottom: 24,
        }}>
          Write more.{" "}
          <span style={{
            background: "linear-gradient(135deg, #0A84FF 20%, #BF5AF2 80%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Lose nothing.
          </span>
        </h1>
        <p style={{
          fontSize: 18, color: T.textMuted, lineHeight: 1.75, marginBottom: 40,
          maxWidth: 500, margin: "0 auto 40px",
        }}>
          The place where song ideas live, grow, and get finished.
          Lyrics, notes, references, AI starters — everything in one place,
          synced to the cloud so you never lose a spark.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="lp-btn-primary" onClick={onGetStarted}
            style={{ fontSize: 16, padding: "15px 36px" }}>
            Open Your Vault Free
          </button>
          <button className="lp-btn-ghost" onClick={onSignIn}
            style={{ fontSize: 16, padding: "15px 36px" }}>
            Sign In
          </button>
        </div>
        <div style={{ marginTop: 18, fontSize: 13, color: T.textFaint }}>
          No credit card · No installs · Works on every device
        </div>
      </section>

      {/* ── From spark to release ── */}
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 88px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="lp-tag" style={{ marginBottom: 16 }}>The flow</div>
          <h2 style={{
            fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 800,
            letterSpacing: -1.2, color: T.text,
          }}>
            From spark to release
          </h2>
          <p style={{ fontSize: 16, color: T.textMuted, marginTop: 12 }}>
            Every hit started as a random idea. Here&apos;s how LyricLab fits your process.
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <StepCard
            number="01" color={T.accent} icon="⚡"
            title="Capture the spark"
            desc="3am melody. Shower hook. Overheard phrase. Get it down in seconds — title, a line, a voice note link. Don't let it disappear."
          />
          <StepCard
            number="02" color={T.purple} icon="✍️"
            title="Build it out"
            desc="Open the song anytime and keep writing. Lyrics editor, notes, status tracking — move it from Idea to In Progress as the song grows."
          />
          <StepCard
            number="03" color={T.orange} icon="✨"
            title="Get unstuck with AI"
            desc="Stuck on a verse? Use the AI Song Starter to generate rhyming ending words or a full lyric draft. Use it as a jumping-off point, not a crutch."
          />
          <StepCard
            number="04" color={T.green} icon="🎧"
            title="Ship it"
            desc="Mark it Done, connect your SoundCloud, and push the release — all from the same app where you wrote the song."
          />
        </div>
      </section>

      {/* ── Quote cards ── */}
      <section style={{
        background: T.card, borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`, padding: "72px 24px",
      }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{
              fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 800,
              letterSpacing: -1, color: T.text,
            }}>
              Built by a writer, for writers
            </h2>
            <p style={{ fontSize: 16, color: T.textMuted, marginTop: 12 }}>
              These are the frustrations that built this app.
            </p>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <QuoteCard
              color={T.accent}
              quote="I had a great hook in my Notes app but by the time I found it the feeling was gone. Now everything starts and lives in one place."
              name="Late-night writer"
              role="Hip-hop, R&B"
            />
            <QuoteCard
              color={T.purple}
              quote="The AI ending words tool is the first AI feature that actually fits how I write. I use it to unlock a verse when I'm circling the same rhyme."
              name="Solo artist"
              role="Pop, indie"
            />
            <QuoteCard
              color={T.green}
              quote="Collaborating used to mean texting voice memos back and forth. Now we both work in the same project, with credits attached to everything."
              name="Producer / co-writer"
              role="Trap, afrobeats"
            />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "72px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="lp-tag" style={{ marginBottom: 16 }}>What&apos;s inside</div>
          <h2 style={{
            fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 800,
            letterSpacing: -1, color: T.text,
          }}>
            Everything you need. Nothing you don&apos;t.
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { icon: "📝", color: T.accent,  label: "Lyrics + notes editor", desc: "Full-screen lyric editor with a separate notes field for mood, themes, and references." },
            { icon: "✨", color: T.purple,  label: "AI Song Starter",       desc: "Generate rhyming ending words or a lyric draft from a genre and theme — get unstuck in 10 seconds." },
            { icon: "📁", color: T.orange,  label: "Projects",              desc: "Group songs into colour-coded projects. Drag unassigned ideas into a project when they're ready." },
            { icon: "🎵", color: T.green,   label: "Audio player",          desc: "Attach audio files or link YouTube references. Hear your beat while you write the words." },
            { icon: "🔗", color: T.accent,  label: "Reference links",       desc: "Pin inspiration — a Spotify song, YouTube video, SoundCloud track — directly to the song it belongs to." },
            { icon: "🤝", color: T.purple,  label: "Credits",               desc: "Every song tracks who wrote, produced, and mixed it. The record is clear before there's anything to dispute." },
            { icon: "📊", color: T.orange,  label: "Status tracking",       desc: "Idea → In Progress → Done. A simple signal for where each song actually is." },
            { icon: "☁️", color: T.green,   label: "Cloud sync",            desc: "Your vault saves automatically. Open on your phone in the studio, pick up on your laptop at home." },
          ].map(({ icon, color, label, desc }) => (
            <div key={label} style={{
              display: "flex", alignItems: "flex-start", gap: 16,
              padding: "18px 20px", borderRadius: 14,
              border: `1px solid ${T.border}`, marginBottom: 8,
              background: T.card,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: color + "20", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 18,
              }}>{icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{
        textAlign: "center", padding: "72px 24px 88px",
        background: T.card, borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <MusicNoteKeyhole size={52} color={T.accent} />
        </div>
        <h2 style={{
          fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 800,
          letterSpacing: -1.2, color: T.text, marginBottom: 16, lineHeight: 1.15,
        }}>
          The song you&apos;re sitting on?<br />
          <span style={{
            background: "linear-gradient(135deg, #0A84FF 20%, #BF5AF2 80%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Write it tonight.
          </span>
        </h2>
        <p style={{
          fontSize: 16, color: T.textMuted, marginBottom: 36,
          maxWidth: 400, margin: "0 auto 36px",
        }}>
          Free to use. No credit card. Your songs stay yours.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="lp-btn-primary" onClick={onGetStarted}
            style={{ fontSize: 16, padding: "15px 36px" }}>
            Open Your Vault Free
          </button>
          <button className="lp-btn-ghost" onClick={onSignIn}
            style={{ fontSize: 16, padding: "15px 36px" }}>
            Sign In
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: "24px", borderTop: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10,
      }}>
        <MusicNoteKeyhole size={18} color={T.textFaint} />
        <span style={{ fontSize: 13, color: T.textFaint }}>LyricLab — write more, finish more</span>
      </footer>
    </div>
  );
}
