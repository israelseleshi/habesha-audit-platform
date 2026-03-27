import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './auth/ProtectedRoute';
import AppShell from './components/AppShell/AppShell';
import NetworkStatus from './components/NetworkStatus/NetworkStatus';
import ToastProvider from './components/Toast/ToastProvider';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';

const Login = lazy(() => import('./pages/Login/Login'));
const Signup = lazy(() => import('./pages/Auth/Signup'));
const VerifyOtp = lazy(() => import('./pages/Auth/VerifyOtp'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword'));
const AuditForm = lazy(() => import('./pages/AuditForm/AuditForm'));
const Supervisor = lazy(() => import('./pages/Supervisor/Supervisor'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const Executive = lazy(() => import('./pages/Executive/Executive'));
const OutletMap = lazy(() => import('./pages/OutletMap/OutletMap'));
const OutletProfile = lazy(() => import('./pages/OutletProfile/OutletProfile'));
const QuestionnaireManager = lazy(() => import('./pages/QuestionnaireManager/QuestionnaireManager'));
const EscalationConsole = lazy(() => import('./pages/EscalationConsole/EscalationConsole'));

function ProtectedAppShell() {
  return (
    <AppShell>
      <NetworkStatus />
      <Outlet />
    </AppShell>
  );
}

function RouteLoader() {
  const { tx } = useLanguage();

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        color: '#f5edd6',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
      role="status"
      aria-live="polite"
    >
      {tx('Loading page...', 'ገጹ በመጫን ላይ ነው...')}
    </main>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />

              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/signup" element={<Signup />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              </Route>

              <Route path="/auth/verify-otp" element={<VerifyOtp />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<ProtectedAppShell />}>
                  <Route path="/audit/new" element={<AuditForm />} />
                  <Route path="/supervisor" element={<Supervisor />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/executive" element={<Executive />} />
                  <Route path="/map" element={<OutletMap />} />
                  <Route path="/outlets/:id" element={<OutletProfile />} />
                  <Route path="/admin/questionnaire" element={<QuestionnaireManager />} />
                  <Route path="/admin/escalations" element={<EscalationConsole />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
