import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DocumentLibraryProvider } from './context/DocumentLibraryContext';
import { UploadWorkflowProvider } from './context/UploadWorkflowContext';
import { DashboardProvider } from './context/DashboardContext';
import { AssistantProvider } from './context/AssistantContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import AuthCallbackPage from './components/auth/AuthCallbackPage';
import MainLayout from './components/app/shared/MainLayout';
import UploadPage from './components/app/upload/UploadPage';
import DocumentLibraryPage from './components/app/library/DocumentLibraryPage';
import DashboardPage from './components/app/dashboard/DashboardPage';
import AssistantPage from './components/app/assistant/AssistantPage';
import ProfilePage from './components/app/profile/ProfilePage';

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
                <Routes>
                  {/* Public pages */}
                  <Route path="/" element={<LandingPage />} />
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
                    <Route path="assistant" element={<AssistantPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>

                  {/* Fallback & legacy auth redirects */}
                  <Route path="/auth" element={<Navigate to="/login" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </AssistantProvider>
          </DashboardProvider>
        </UploadWorkflowProvider>
      </DocumentLibraryProvider>
    </AuthProvider>
  );
}

export default App;
