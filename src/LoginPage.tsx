import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function parseFirebaseError(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email atau password salah. Silakan periksa kembali.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/user-disabled":
      return "Akun ini telah dinonaktifkan. Hubungi administrator.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan login. Coba lagi beberapa saat.";
    case "auth/network-request-failed":
      return "Gagal terhubung ke server. Periksa koneksi internet.";
    default:
      return "Login gagal. Silakan coba lagi.";
  }
}

interface Props {
  dark: boolean;
  onToggleDark: () => void;
}

export default function LoginPage({ dark, onToggleDark }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      setError(parseFirebaseError((err as { code?: string }).code ?? ""));
    } finally {
      setLoading(false);
    }
  };

  const inputBase: React.CSSProperties = {
    width: "100%",
    background: "var(--t-surface-deep)",
    border: "1px solid var(--t-border)",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "var(--t-text)",
    fontSize: "0.875rem",
    fontFamily: "DM Sans, system-ui, sans-serif",
    outline: "none",
    transition: "border-color 0.15s ease",
    boxSizing: "border-box",
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-4 relative" style={{ background: "var(--t-bg)", fontFamily: "DM Sans, system-ui, sans-serif" }}>
      {/* Grid bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(var(--t-border) 1px, transparent 1px), linear-gradient(90deg, var(--t-border) 1px, transparent 1px)`,
        backgroundSize: "40px 40px", opacity: 0.4,
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 100%)",
      }} />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <button onClick={onToggleDark} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-muted)", cursor: "pointer", fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
          <span style={{ color: "var(--t-text)" }}>{dark ? <SunIcon /> : <MoonIcon />}</span>
          {dark ? "Light" : "Dark"}
        </button>
      </div>

      <div className="w-full relative z-10" style={{ maxWidth: "400px" }}>
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl"
            style={{ background: "var(--t-primary-dim)", border: "1px solid var(--t-primary-ring)", boxShadow: "0 0 24px var(--t-primary)22" }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
              <path d="M8 1C5.5 1 4 3 4 5c0 3 4 10 4 10s4-7 4-10c0-2-1.5-4-4-4z" stroke="var(--t-primary)" strokeWidth="1.2" fill="var(--t-primary-dim)" />
              <circle cx="8" cy="5" r="1.5" fill="var(--t-primary)" />
            </svg>
          </div>
          <div className="text-center">
            <div className="font-semibold text-base" style={{ color: "var(--t-text)", letterSpacing: "-0.02em" }}>IoT Dispenser Monitor</div>
            <div style={{ fontSize: "0.7rem", color: "var(--t-muted)", marginTop: "2px" }}>Smart Water Management System</div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 flex flex-col gap-5"
          style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 8px 40px #00000028" }}>
          <div>
            <div className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>Masuk ke Dashboard</div>
            <div style={{ fontSize: "0.72rem", color: "var(--t-muted)", marginTop: "2px" }}>Gunakan akun yang terdaftar oleh administrator</div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "0.65rem", color: "var(--t-muted)", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>EMAIL</label>
              <input type="email" autoComplete="email" placeholder="nama@perusahaan.com" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                style={{ ...inputBase, borderColor: error ? "var(--t-danger)" : "var(--t-border)" }}
                onFocus={(e) => { if (!error) (e.target as HTMLInputElement).style.borderColor = "var(--t-primary-ring)"; }}
                onBlur={(e) => { if (!error) (e.target as HTMLInputElement).style.borderColor = "var(--t-border)"; }}
                required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "0.65rem", color: "var(--t-muted)", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>PASSWORD</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  style={{ ...inputBase, borderColor: error ? "var(--t-danger)" : "var(--t-border)", paddingRight: "42px" }}
                  onFocus={(e) => { if (!error) (e.target as HTMLInputElement).style.borderColor = "var(--t-primary-ring)"; }}
                  onBlur={(e) => { if (!error) (e.target as HTMLInputElement).style.borderColor = "var(--t-border)"; }}
                  required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t-dim)", padding: "2px" }}>
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
                style={{ background: "color-mix(in srgb, var(--t-danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--t-danger) 30%, transparent)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t-danger)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: "1px" }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ fontSize: "0.75rem", color: "var(--t-danger)", lineHeight: 1.4 }}>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || !email || !password}
              className="w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2"
              style={{
                background: loading || !email || !password ? "color-mix(in srgb, var(--t-primary) 50%, transparent)" : "var(--t-primary)",
                color: "#0a0d12", border: "none", cursor: loading || !email || !password ? "not-allowed" : "pointer",
              }}>
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Memverifikasi...
                </>
              ) : "Masuk"}
            </button>
          </form>
        </div>

        <p className="text-center mt-4" style={{ fontSize: "0.65rem", color: "var(--t-dim)", fontFamily: "JetBrains Mono, monospace" }}>
          Akses terbatas · Hanya untuk administrator sistem
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
