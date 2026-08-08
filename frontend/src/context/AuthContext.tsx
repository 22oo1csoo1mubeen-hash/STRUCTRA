import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase, STORAGE_PREF_KEY } from '../lib/supabase';

/* ─── Types ───────────────────────────────────────────── */
interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** True until the initial session check has completed. */
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: AuthError | null }>;
  loginWithGoogle: (rememberMe?: boolean) => Promise<{ error: AuthError | null }>;
  register: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: AuthError | null; emailSent: boolean; duplicateEmail?: boolean }>;
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
}

/* ─── Context ─────────────────────────────────────────── */
const AuthContext = createContext<AuthContextValue | null>(null);

/* ─── Provider ────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  /**
   * loading starts true and is only set to false after the INITIAL_SESSION
   * event fires from onAuthStateChange. This is the single, reliable signal
   * that the SDK has finished restoring (or not) a persisted session.
   * Using getSession() in parallel would create a race condition where the
   * ProtectedRoute could briefly see loading=false + session=null and redirect
   * to /login before onAuthStateChange has had a chance to hydrate the session.
   */
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'INITIAL_SESSION') {
        // SDK has finished checking persisted storage. This fires exactly once
        // on mount — even when there is no stored session (newSession = null).
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        return;
      }

      // All subsequent events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── Login ──────────────────────────────────────────── */
  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      // Write the preference BEFORE signing in so the storage adapter
      // uses the right bucket when it stores the returned session tokens.
      if (rememberMe) {
        localStorage.setItem(STORAGE_PREF_KEY, 'true');
      } else {
        localStorage.removeItem(STORAGE_PREF_KEY);
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    },
    []
  );

  /* ── Google OAuth ────────────────────────────────── */
  const loginWithGoogle = useCallback(async (rememberMe = false) => {
    // Write the preference BEFORE redirecting to Google.
    // When the user returns to /auth/callback, the Supabase client
    // will initialize and use our custom storage adapter which reads this key.
    if (rememberMe) {
      localStorage.setItem(STORAGE_PREF_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_PREF_KEY);
    }

    /**
     * signInWithOAuth redirects the browser to Google's consent screen.
     * After the user grants access, Google redirects back to Supabase,
     * which then redirects to our /auth/callback route with the session
     * tokens in the URL hash. The SDK (detectSessionInUrl=true) exchanges
     * them automatically.
     *
     * We use window.location.origin so the URL is always correct in both
     * local development (http://localhost:5173) and production.
     */
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    return { error };
  }, []);

  /* ── Register ───────────────────────────────────────── */
  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      /**
       * The confirmation link in the email must point back to the
       * frontend's /auth/callback route so our React page can handle
       * the hash token and show the success/failure state.
       *
       * window.location.origin resolves to http://localhost:5173 in dev
       * and to the deployed domain in production — no hard-coded URL needed.
       */
      const emailRedirectTo = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo,
        },
      });

      if (error) {
        return { error, emailSent: false };
      }

      /**
       * Duplicate-email detection.
       *
       * When "Confirm email" is ENABLED and a user tries to sign up with an
       * already-registered address, Supabase intentionally returns:
       *   error = null  (to prevent user enumeration)
       *   data.user     = a user object
       *   data.user.identities = []   ← empty — this is the signal
       *
       * We detect this and return a dedicated flag instead of pretending a
       * new confirmation email was sent.
       */
      const isDuplicate =
        data.user != null &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0;

      if (isDuplicate) {
        return { error: null, emailSent: false, duplicateEmail: true };
      }

      /**
       * Determine whether the user still needs to verify their email.
       *
       * Supabase behaviour when "Confirm email" is ENABLED in the dashboard:
       *   - data.user is set (user row created)
       *   - data.user.email_confirmed_at is null  ← not yet verified
       *   - data.session may still be non-null in certain SDK versions
       *
       * We check email_confirmed_at rather than session presence because it is
       * the authoritative field. If confirmation is required and a temporary
       * session was auto-created, we sign the user out immediately so they
       * cannot bypass verification by simply refreshing the page.
       */
      const needsVerification =
        data.user != null && data.user.email_confirmed_at == null;

      if (needsVerification) {
        // Sign out any auto-created unconfirmed session so ProtectedRoute
        // keeps them away from the dashboard until they verify.
        if (data.session) {
          await supabase.auth.signOut();
        }
        return { error: null, emailSent: true };
      }

      // Email confirmation is disabled in the Supabase dashboard — the user
      // is immediately confirmed and a valid session was returned.
      return { error: null, emailSent: false };
    },
    []
  );

  /* ── Resend confirmation ─────────────────────────────── */
  const resendConfirmation = useCallback(async (email: string) => {
    const emailRedirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    });
    return { error };
  }, []);

  /* ── Password Recovery ──────────────────────────────── */
  const resetPassword = useCallback(async (email: string) => {
    // Route through our single callback page, which is already whitelisted
    // in the Supabase redirect URIs. It will detect type=recovery and
    // send the user to the Reset Password page.
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  }, []);

  /* ── Logout ─────────────────────────────────────────── */
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, login, loginWithGoogle, register, resendConfirmation, resetPassword, updatePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ─── Raw context export for useAuth hook ─────────────── */
export { AuthContext };

