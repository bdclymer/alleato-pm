// TODO(megan): If manual sync triggering is needed, forward to Python backend instead of stubbing.
export async function POST() {
  return Response.json({
    status: 'ok',
    message: 'Acumatica sync runs automatically every 2 hours via Render cron alleato-acumatica-financial-sync. Manual triggering from the frontend is disabled — the data you see is updated by the backend on schedule.',
    deprecated: true,
  });
}
