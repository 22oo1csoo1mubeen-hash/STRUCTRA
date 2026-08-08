import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Props {
  children: ReactNode;
}

/**
 * ProtectedRoute
 * Wraps authenticated pages.
 *
 * Flow:
 *  loading → full-screen spinner (prevents flash of login page on refresh)
 *  no session → redirect to /login
 *  session OK → render children
 */
export default function ProtectedRoute({ children }: Props) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0805',
        }}
      >
        {/* Minimal spinner matching the orange brand palette */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid rgba(255, 185, 80, 0.15)',
            borderTopColor: 'rgba(255, 185, 80, 0.85)',
            animation: 'spin 0.75s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
