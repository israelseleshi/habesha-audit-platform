import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthHooks';
import { canAccessPath, resolveLandingPath } from './roleRoutes';

function AuthLoader() {
  return (
    <main
      role="status"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        color: '#f5edd6',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}
    >
      Loading authentication...
    </main>
  );
}

export function ProtectedRoute({ allowedRoles }) {
  const { authReady, isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return <AuthLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={resolveLandingPath(role)} replace />;
  }

  if (!canAccessPath(role, location.pathname)) {
    return <Navigate to={resolveLandingPath(role)} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { authReady, isAuthenticated, role } = useAuth();

  if (!authReady) {
    return <AuthLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={resolveLandingPath(role)} replace />;
  }

  return <Outlet />;
}
