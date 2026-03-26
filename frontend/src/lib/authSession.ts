/**
 * Bridges axios 401 handling to React Router without a full page reload.
 * Registered from a component inside BrowserRouter via setUnauthorizedHandler.
 */
type UnauthorizedHandler = (() => void) | null;

let unauthorizedHandler: UnauthorizedHandler = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

export function notifySessionExpired() {
  localStorage.removeItem('token');
  unauthorizedHandler?.();
}
