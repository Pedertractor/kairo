// Route templates (rather than user-controlled URL text) define the complete kiosk API.
const ALLOWED_ROUTES = new Set([
  'GET /api/auth/me',
  'POST /api/auth/logout',
  'POST /api/production/session/activity',
  'GET /api/production/activities',
  'GET /api/time-entries/active',
  'POST /api/time-entries/active/pause',
  'POST /api/teams/:teamId/activities/:activityId/time-entries',
]);

export function isProductionRouteAllowed(method: string, route: string): boolean {
  return ALLOWED_ROUTES.has(`${method} ${route}`);
}
