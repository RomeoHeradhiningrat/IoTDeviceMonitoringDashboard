import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./firebase";
import LoginPage from "./LoginPage";
import App from "./App";

export default function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    document.title = "Dispenser Monitor";
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "var(--t-bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t-primary)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "var(--t-muted)" }}>
            Menghubungkan ke Firebase...
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage dark={dark} onToggleDark={() => setDark((d) => !d)} />;
  }

  return (
    <App
      user={user}
      dark={dark}
      onToggleDark={() => setDark((d) => !d)}
      onLogout={() => signOut(auth)}
    />
  );
}
