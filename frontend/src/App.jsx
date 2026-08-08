import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import AuthCallbackPage from './components/auth/AuthCallbackPage';
import MainLayout from './components/app/MainLayout';
import UploadPage from './components/app/UploadPage';

/**
 * App
 * Root router — maps URL paths to page components.
 * /app/* uses MainLayout as the persistent shell with nested page routes.
 * All /app/* routes are protected by ProtectedRoute which checks the session.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          {/* Email confirmation callback — Supabase redirects here after the user
              clicks the confirmation link. detectSessionInUrl on the client
              processes the hash token automatically. */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          
          {/* Reset password page — user lands here from the recovery callback */}
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

          {/* Main application — authenticated shell */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect to upload */}
            <Route index element={<Navigate to="upload" replace />} />
            <Route path="upload" element={<UploadPage />} />
            {/* Future routes: dashboard, library, assistant, settings, profile */}
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
