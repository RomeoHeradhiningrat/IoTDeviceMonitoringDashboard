import { useState, useEffect, useRef } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import type { User } from "firebase/auth";
import { db, MASTER_EMAIL } from "./firebase";

// ── Types ──────────────────────────────────────────────────────────────────

interface DeviceData {
  deviceId: string;
  lastSeen: number;
  online: boolean;
  statusGalon: number; // 1 = tersedia, 0 = habis
  suhuDingin: number;
  suhuPanas: number;
  totalPenggunaanAir: number;
}

interface DeviceEntry {
  id: string;         // key used in Firebase (e.g. "6pRV")
  label: string;      // user-defined friendly name
  data: DeviceData | null;
  isOnline: boolean;
}

// ── Icons ──────────────────────────────────────────────────────────────────

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

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isOnlineByLastSeen(lastSeen: number): boolean {
  return Date.now() - lastSeen < 40_000;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "Baru saja";
  if (diff < 60) return `${diff} detik lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  return `${Math.floor(diff / 3600)} jam lalu`;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ online }: { online: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        {online && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--t-primary)" }} />}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: online ? "var(--t-primary)" : "var(--t-offline)" }} />
      </span>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: online ? "var(--t-primary)" : "var(--t-dim)", letterSpacing: "0.05em", fontWeight: 500 }}>
        {online ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
}

function WaterBadge({ available, hasData, isOnline }: { available: boolean; hasData: boolean; isOnline: boolean }) {
  if (!hasData || !isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ background: "var(--t-surface-deep)", border: "1px solid var(--t-border)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--t-offline)" stroke="none">
          <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z" />
        </svg>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "var(--t-dim)" }}>
          {!hasData ? "Menunggu data..." : "Tidak diketahui"}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{
        background: available
          ? "color-mix(in srgb, var(--t-primary) 10%, transparent)"
          : "color-mix(in srgb, var(--t-danger) 10%, transparent)",
        border: `1px solid ${available
          ? "color-mix(in srgb, var(--t-primary) 30%, transparent)"
          : "color-mix(in srgb, var(--t-danger) 30%, transparent)"}`,
        animation: !available ? "blink-danger 1.2s ease-in-out infinite" : "none",
      }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={available ? "var(--t-primary)" : "var(--t-danger)"} stroke="none">
        <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z" />
      </svg>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", fontWeight: 600, color: available ? "var(--t-primary)" : "var(--t-danger)", letterSpacing: "0.03em" }}>
        {available ? "TERSEDIA" : "HABIS"}
      </span>
    </div>
  );
}

function DeviceCard({ entry, onRemove }: { entry: DeviceEntry; onRemove: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data, isOnline, label, id } = entry;
  const hasData = data !== null;

  const borderColor = !isOnline
    ? "var(--t-border)"
    : !hasData
    ? "var(--t-border)"
    : "var(--t-border)";

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--t-surface)", border: `1px solid ${borderColor}`, boxShadow: "0 2px 8px #00000012", transition: "transform 0.15s ease" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "var(--t-muted)", letterSpacing: "0.08em" }}>
            ID: {id}
          </span>
          <span className="font-medium text-sm" style={{ color: "var(--t-text)" }}>{label}</span>
          {hasData && (
            <span style={{ fontSize: "0.65rem", color: "var(--t-dim)" }}>
              {timeAgo(data!.lastSeen)}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge online={isOnline} />
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={onRemove}
                className="px-2 py-0.5 rounded text-xs"
                style={{ background: "color-mix(in srgb, var(--t-danger) 15%, transparent)", color: "var(--t-danger)", border: "1px solid color-mix(in srgb, var(--t-danger) 30%, transparent)", cursor: "pointer", fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem" }}>
                Hapus
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2 py-0.5 rounded text-xs"
                style={{ background: "var(--t-surface-deep)", color: "var(--t-muted)", border: "1px solid var(--t-border)", cursor: "pointer", fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem" }}>
                Batal
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded"
              style={{ color: "var(--t-dim)", background: "transparent", border: "1px solid transparent", cursor: "pointer" }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "var(--t-danger)"; b.style.borderColor = "color-mix(in srgb, var(--t-danger) 30%, transparent)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "var(--t-dim)"; b.style.borderColor = "transparent"; }}>
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {/* Water status */}
      <WaterBadge available={data?.statusGalon === 1} hasData={hasData} isOnline={isOnline} />

      <div style={{ height: "1px", background: "var(--t-border)" }} />

      {/* Total penggunaan air */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "0.7rem", color: "var(--t-muted)", letterSpacing: "0.04em" }}>TOTAL PENGGUNAAN AIR</span>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", fontWeight: 600, color: "var(--t-accent)" }}>
          {hasData
            ? `${data!.totalPenggunaanAir.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "—"}
          {hasData && <span style={{ color: "var(--t-muted)", fontSize: "0.65rem", marginLeft: "2px" }}>L</span>}
        </span>
      </div>

      <div style={{ height: "1px", background: "var(--t-border)" }} />

      {/* Temperature */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { emoji: "🔴", label: "SUHU PANAS", value: data?.suhuPanas, color: "var(--t-hot)" },
          { emoji: "🔵", label: "SUHU DINGIN", value: data?.suhuDingin, color: "var(--t-cold)" },
        ].map((t) => (
          <div key={t.label} className="rounded-lg p-2.5 flex flex-col gap-1"
            style={{ background: "var(--t-surface-deep)", border: "1px solid var(--t-border)" }}>
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: "0.75rem" }}>{t.emoji}</span>
              <span style={{ fontSize: "0.65rem", color: "var(--t-muted)", letterSpacing: "0.04em" }}>{t.label}</span>
            </div>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1rem", fontWeight: 600, color: hasData && isOnline ? t.color : "var(--t-offline)" }}>
              {hasData ? `${t.value?.toFixed(1)}°` : "—"}
            </span>
            <span style={{ fontSize: "0.6rem", color: "var(--t-muted)" }}>Celcius</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Add Device Modal ────────────────────────────────────────────────────────

function AddDeviceModal({ onClose, onAdd, existingIds }: {
  onClose: () => void;
  onAdd: (id: string, label: string) => Promise<string | null>;
  existingIds: string[];
}) {
  const [deviceId, setDeviceId] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimId = deviceId.trim();
    const trimLabel = label.trim();
    if (!trimId || !trimLabel) return;
    if (existingIds.includes(trimId)) {
      setError("Device ID ini sudah ditambahkan.");
      return;
    }
    setLoading(true);
    setError("");
    const err = await onAdd(trimId, trimLabel);
    if (err) setError(err);
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--t-surface-deep)", border: "1px solid var(--t-border)",
    borderRadius: "10px", padding: "10px 12px", color: "var(--t-text)", fontSize: "0.85rem",
    fontFamily: "JetBrains Mono, monospace", outline: "none", boxSizing: "border-box",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 24px 64px #00000044" }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--t-border)" }}>
          <div>
            <div className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>Tambah Perangkat</div>
            <div style={{ fontSize: "0.65rem", color: "var(--t-muted)" }}>Masukkan Device ID dari Firebase</div>
          </div>
          <button onClick={onClose} style={{ color: "var(--t-muted)", background: "none", border: "none", cursor: "pointer" }}>
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "0.65rem", color: "var(--t-muted)", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>
              DEVICE ID
            </label>
            <input
              placeholder="contoh: AbCd"
              value={deviceId}
              onChange={(e) => { setDeviceId(e.target.value); setError(""); }}
              style={{ ...inputStyle, borderColor: error ? "var(--t-danger)" : "var(--t-border)" }}
              autoFocus
            />
            <span style={{ fontSize: "0.65rem", color: "var(--t-dim)" }}>
              ID perangkat sesuai yang terdaftar di Firebase Realtime Database
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "0.65rem", color: "var(--t-muted)", letterSpacing: "0.06em", fontFamily: "JetBrains Mono, monospace" }}>
              NAMA TAMPILAN
            </label>
            <input
              placeholder="contoh: Smart Dispenser Lobby"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ ...inputStyle, fontFamily: "DM Sans, system-ui, sans-serif" }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "color-mix(in srgb, var(--t-danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--t-danger) 30%, transparent)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t-danger)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span style={{ fontSize: "0.72rem", color: "var(--t-danger)" }}>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl text-sm"
              style={{ background: "var(--t-surface-deep)", color: "var(--t-muted)", border: "1px solid var(--t-border)", cursor: "pointer" }}>
              Batal
            </button>
            <button type="submit" disabled={loading || !deviceId.trim() || !label.trim()}
              className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{
                background: loading || !deviceId.trim() || !label.trim() ? "color-mix(in srgb, var(--t-primary) 50%, transparent)" : "var(--t-primary)",
                color: "#0a0d12", border: "none", cursor: loading || !deviceId.trim() || !label.trim() ? "not-allowed" : "pointer",
              }}>
              {loading ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Memverifikasi...
                </>
              ) : "Tambah"}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────

interface AppProps {
  user: User;
  dark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}

type Filter = "all" | "online" | "offline";

export default function App({ user, dark, onToggleDark, onLogout }: AppProps) {
  const [entries, setEntries] = useState<DeviceEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [now, setNow] = useState(Date.now());

  const isMaster = user.email === MASTER_EMAIL;
  const userDevicesPath = `users/${user.uid}/devices`;

  // Tick every 5s to refresh "time ago" and online status
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);

  // Listen to user's device list in RTDB → /users/{uid}/devices/{id}: label
  useEffect(() => {
    const listRef = ref(db, userDevicesPath);
    const unsub = onValue(listRef, (snap) => {
      const val: Record<string, string> | null = snap.val();
      if (!val) {
        setEntries([]);
        return;
      }
      setEntries((prev) => {
        const ids = Object.keys(val);
        // Keep existing entries, add new ones, remove deleted
        const next: DeviceEntry[] = ids.map((id) => {
          const existing = prev.find((e) => e.id === id);
          return existing
            ? { ...existing, label: val[id] }
            : { id, label: val[id], data: null, isOnline: false };
        });
        return next;
      });
    });
    return unsub;
  }, [userDevicesPath]);

  // Track refs for device listeners so we can clean them up
  const unsubsRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    const ids = entries.map((e) => e.id);

    // Detach listeners for removed devices
    Object.keys(unsubsRef.current).forEach((id) => {
      if (!ids.includes(id)) {
        unsubsRef.current[id]();
        delete unsubsRef.current[id];
      }
    });

    // Attach listeners for new devices
    ids.forEach((id) => {
      if (unsubsRef.current[id]) return;
      const deviceRef = ref(db, `devices/${id}`);
      unsubsRef.current[id] = onValue(deviceRef, (snap) => {
        const data: DeviceData | null = snap.val();
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, data, isOnline: data ? isOnlineByLastSeen(data.lastSeen) : false }
              : e
          )
        );
      });
    });

    return () => {
      // Cleanup all on unmount
      Object.values(unsubsRef.current).forEach((fn) => fn());
      unsubsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map((e) => e.id).join(",")]);

  // Recompute isOnline on each tick
  const displayEntries = entries.map((e) => ({
    ...e,
    isOnline: e.data ? isOnlineByLastSeen(e.data.lastSeen) : false,
  }));

  const filtered = displayEntries.filter((e) => {
    if (filter === "online") return e.isOnline;
    if (filter === "offline") return !e.isOnline;
    return true;
  });

  const totalOnline = displayEntries.filter((e) => e.isOnline).length;
  const totalOffline = displayEntries.length - totalOnline;

  // Add device — save to RTDB /users/{uid}/devices/{id}
  const handleAdd = async (id: string, label: string): Promise<string | null> => {
    try {
      await set(ref(db, `${userDevicesPath}/${id}`), label);
      setShowAddModal(false);
      return null;
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "";
      if (msg.includes("permission")) return "Akses ditolak. Periksa rules Firebase.";
      return "Gagal menambahkan perangkat.";
    }
  };

  // Remove device — delete from RTDB
  const handleRemove = async (id: string) => {
    await remove(ref(db, `${userDevicesPath}/${id}`));
  };

  const timeStr = new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = new Date(now).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-full flex flex-col" style={{ background: "var(--t-bg)", fontFamily: "DM Sans, system-ui, sans-serif", transition: "background 0.2s ease" }}>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: "var(--t-bg)ee", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: "var(--t-primary-dim)" }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M8 1C5.5 1 4 3 4 5c0 3 4 10 4 10s4-7 4-10c0-2-1.5-4-4-4z" stroke="var(--t-primary)" strokeWidth="1.2" fill="var(--t-primary-dim)" />
              <circle cx="8" cy="5" r="1.5" fill="var(--t-primary)" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="font-semibold text-sm" style={{ color: "var(--t-text)", letterSpacing: "-0.01em" }}>IoT Dispenser Monitor</div>
              {isMaster && (
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.55rem", color: "var(--t-warning)", background: "color-mix(in srgb, var(--t-warning) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--t-warning) 30%, transparent)", padding: "1px 6px", borderRadius: "4px", letterSpacing: "0.06em" }}>
                  MASTER
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--t-muted)" }}>Smart Water Management System</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live stats */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--t-primary)" }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "var(--t-muted)" }}>
                <span style={{ color: "var(--t-primary)" }}>{totalOnline}</span> online
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--t-offline)" }} />
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem", color: "var(--t-muted)" }}>
                <span style={{ color: "var(--t-dim)" }}>{totalOffline}</span> offline
              </span>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.85rem", color: "var(--t-primary)", letterSpacing: "0.04em" }}>{timeStr}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--t-muted)" }}>{dateStr}</div>
          </div>

          <button onClick={onToggleDark}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-muted)", cursor: "pointer", fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace" }}>
            <span style={{ color: "var(--t-text)" }}>{dark ? <SunIcon /> : <MoonIcon />}</span>
            {dark ? "Light" : "Dark"}
          </button>

          {/* User + logout */}
          <div className="flex items-center gap-2 pl-2" style={{ borderLeft: "1px solid var(--t-border)" }}>
            <div className="hidden sm:block text-right">
              <div style={{ fontSize: "0.7rem", color: "var(--t-text)", fontWeight: 500 }}>
                {user.displayName ?? user.email?.split("@")[0]}
              </div>
              <div style={{ fontSize: "0.6rem", color: "var(--t-muted)" }}>{user.email}</div>
            </div>
            <button onClick={onLogout} title="Keluar"
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-muted)", cursor: "pointer" }}
              onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "var(--t-danger)"; b.style.borderColor = "color-mix(in srgb, var(--t-danger) 30%, transparent)"; }}
              onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "var(--t-muted)"; b.style.borderColor = "var(--t-border)"; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 flex flex-col gap-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Total Perangkat", value: displayEntries.length, unit: "unit", color: "var(--t-accent)" },
            { label: "Perangkat Online", value: totalOnline, unit: "unit", color: "var(--t-primary)" },
            { label: "Perangkat Offline", value: totalOffline, unit: "unit", color: totalOffline > 0 ? "var(--t-danger)" : "var(--t-dim)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl px-4 py-3"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--t-muted)", letterSpacing: "0.06em", marginBottom: "4px" }}>
                {s.label.toUpperCase()}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.4rem", fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.value}</span>
                <span style={{ fontSize: "0.65rem", color: "var(--t-muted)" }}>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter + Add */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            {(["all", "online", "offline"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{
                  fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.04em", cursor: "pointer",
                  background: filter === f ? "var(--t-primary-dim)" : "transparent",
                  color: filter === f ? "var(--t-primary)" : "var(--t-muted)",
                  border: filter === f ? "1px solid var(--t-primary-ring)" : "1px solid transparent",
                }}>
                {f === "all" ? "Semua" : f === "online" ? "Online" : "Offline"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: "var(--t-dim)" }}>
              {filtered.length}/{displayEntries.length} perangkat
            </span>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--t-primary)", color: "#0a0d12", border: "none", cursor: "pointer" }}>
              <PlusIcon /> Tambah Perangkat
            </button>
          </div>
        </div>

        {/* Cards */}
        {displayEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl"
              style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--t-dim)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z" />
              </svg>
            </div>
            <div className="text-center">
              <div className="font-medium text-sm" style={{ color: "var(--t-text)", marginBottom: "4px" }}>Belum ada perangkat</div>
              <div style={{ fontSize: "0.75rem", color: "var(--t-muted)" }}>Tambahkan Device ID untuk mulai memantau</div>
            </div>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium mt-1"
              style={{ background: "var(--t-primary)", color: "#0a0d12", border: "none", cursor: "pointer" }}>
              <PlusIcon /> Tambah Perangkat Pertama
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span style={{ fontSize: "2rem", opacity: 0.3 }}>📡</span>
            <span style={{ color: "var(--t-dim)", fontSize: "0.875rem" }}>Tidak ada perangkat yang cocok dengan filter ini</span>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtered.map((entry) => (
              <DeviceCard key={entry.id} entry={entry} onRemove={() => handleRemove(entry.id)} />
            ))}
          </div>
        )}
      </main>

      <footer className="px-6 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--t-border)" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "var(--t-dim)" }}>SMART DISPENSER MONITORING v2.0.0</span>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "var(--t-dim)" }}>REALTIME · FIREBASE RTDB</span>
      </footer>

      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
          existingIds={entries.map((e) => e.id)}
        />
      )}
    </div>
  );
}
