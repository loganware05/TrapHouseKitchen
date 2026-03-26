import { useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setUnauthorizedHandler } from '../lib/authSession';
import { useAuthStore } from '../stores/authStore';

/**
 * Wires API 401 handling to client-side navigation and auth store cleanup.
 */
export default function UnauthorizedRedirect() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  useLayoutEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      navigate('/login', { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, logout]);

  return null;
}
