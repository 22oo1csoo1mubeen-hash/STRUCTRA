import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file."
  );
}

/**
 * The key we store in localStorage to track the user's "Remember me" choice.
 * This is a tiny string flag — it does NOT contain any credentials.
 */
export const STORAGE_PREF_KEY = "structra_remember_me";

/**
 * Custom storage adapter.
 *
 * • "Remember me" ON  → store session in localStorage  (survives browser restarts)
 * • "Remember me" OFF → store session in sessionStorage (cleared when tab/window closes)
 *
 * Reading falls back to localStorage so that an existing remembered session
 * is always found, regardless of where we are in the preference toggle.
 */
const rememberMeStorage = {
  getItem(key: string): string | null {
    // Always check both — the preference might have changed since last write
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    const remember = localStorage.getItem(STORAGE_PREF_KEY) === "true";
    if (remember) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key); // clean up any leftover session storage
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key); // ensure old "remembered" token is cleared
    }
  },
  removeItem(key: string): void {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: rememberMeStorage,
    // autoRefreshToken and persistSession default to true — keep them that way
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
