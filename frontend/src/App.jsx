import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DocumentLibraryProvider } from './context/DocumentLibraryContext';
import { UploadWorkflowProvider } from './context/UploadWorkflowContext';
import { DashboardProvider } from './context/DashboardContext';
import { AssistantProvider } from './context/AssistantContext';
import ProtectedRoute from './components/ProtectedRoute';
const LandingPage = lazy(() => import('./components/landing/LandingPage'));
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const RegisterPage = lazy(() => import('./components/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./components/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./components/auth/ResetPasswordPage'));
const AuthCallbackPage = lazy(() => import('./components/auth/AuthCallbackPage'));
const AboutPage = lazy(() => import('./components/about/AboutPage'));
import MainLayout from './components/app/shared/MainLayout';
const UploadPage = lazy(() => import('./components/app/upload/UploadPage'));
const DocumentLibraryPage = lazy(() => import('./components/app/library/DocumentLibraryPage'));
const CategoriesPage = lazy(() => import('./components/app/categories/CategoriesPage'));
const DashboardPage = lazy(() => import('./components/app/dashboard/DashboardPage'));
const AssistantPage = lazy(() => import('./components/app/assistant/AssistantPage'));
const ProfilePage = lazy(() => import('./components/app/profile/ProfilePage'));

/**
 * App
 * Root router — maps URL paths to page components.
 * /app/* uses MainLayout as the persistent shell with nested page routes.
 * All /app/* routes are protected by ProtectedRoute which checks the session.
 */
function App() {
  return (
    <AuthProvider>
      <DocumentLibraryProvider>
        <UploadWorkflowProvider>
          <DashboardProvider>
            <AssistantProvider>
              <BrowserRouter>
                <Suspense fallback={(
                  <div
                    role="status"
                    aria-live="polite"
                    style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#080a0d', color: '#f97316', fontFamily: 'Inter, sans-serif' }}
                  >
                    Loading STRUCTRA…
                  </div>
                )}>
                <Routes>
                  {/* Public pages */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  {/* Email confirmation callback */}
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  
                  {/* Reset password page */}
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
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="library" element={<DocumentLibraryPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="assistant" element={<AssistantPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>

                  {/* Fallback & legacy auth redirects */}
                  <Route path="/auth" element={<Navigate to="/login" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
            </AssistantProvider>
          </DashboardProvider>
        </UploadWorkflowProvider>
      </DocumentLibraryProvider>
    </AuthProvider>
  );
}

export default App;
