import { useSyncExternalStore } from "react";

export type Session = { name: string; email: string; token: string };

const KEY = "headless-auth-v1";
let session: Session | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    session = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    session = null;
  }
}

function commit(next: Session | null) {
  session = next;
  if (next) localStorage.setItem(KEY, JSON.stringify(next));
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export const auth = {
  signIn: (s: Session) => {
    load();
    commit(s);
  },
  signOut: () => {
    load();
    commit(null);
  },
};

export function useAuth() {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      cb();
      return () => listeners.delete(cb);
    },
    () => (loaded ? session : null),
    () => null,
  );
}

/** Sapaan berdasarkan jam di zona waktu toko (Asia/Jakarta). */
export function timeGreeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(now),
  );
  if (hour >= 4 && hour < 11) return "Selamat Pagi";
  if (hour >= 11 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 19) return "Selamat Sore";
  return "Selamat Malam";
}
