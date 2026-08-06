import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import MainLayout from './components/app/MainLayout';
import UploadPage from './components/app/UploadPage';

/**
 * App
 * Root router — maps URL paths to page components.
 * /app/* uses MainLayout as the persistent shell with nested page routes.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Main application — authenticated shell */}
        <Route path="/app" element={<MainLayout />}>
          {/* Default redirect to upload */}
          <Route index element={<Navigate to="upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          {/* Future routes: dashboard, library, assistant, settings, profile */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
