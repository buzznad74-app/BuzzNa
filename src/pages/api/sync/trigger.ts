import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Server-side sync trigger endpoint for client-side queued syncs.
// - Upserts branding/settings into a business_settings table
// - Optionally enqueues mail/forecast jobs into outbox tables if present
// Security: If SYNC_SECRET env var is set, the request must include header `x-sync-secret` with that value.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SYNC_SECRET = process.env.SYNC_SECRET; // optional

const makeSupabase = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Optional token guard for extra security in production
  if (SYNC_SECRET) {
    const token = req.headers['x-sync-secret'] as string | undefined;
    if (!token || token !== SYNC_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const body = req.body || {};
  const { tenantId, branding, settings, welcomeEmail, forecast } = body;

  // Defensive: require at minimum a tenantId or payload to act on
  if (!tenantId && !branding && !settings && !welcomeEmail && !forecast) {
    return res.status(400).json({ error: 'invalid payload' });
  }

  const supabase = makeSupabase();
  if (!supabase) {
    console.warn('[sync/trigger] missing SUPABASE config');
    return res.status(500).json({ error: 'server misconfigured' });
  }

  try {
    const processed: Record<string, any> = {};

    // Upsert branding -> business_settings
    if (branding) {
      const up = {
        tenant_id: tenantId,
        chosen_theme: branding.theme ?? null,
        brand_color: branding.brandColor ?? null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('business_settings').upsert(up, { onConflict: ['tenant_id'] });
      processed.branding = true;
    }

    // Upsert operational settings
    if (settings) {
      const up = {
        tenant_id: tenantId,
        daily_revenue_target: settings.dailyTarget ?? null,
        weekly_revenue_target: settings.weeklyTarget ?? null,
        monthly_revenue_target: settings.monthlyTarget ?? null,
        eod_time: settings.eodTime ?? null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('business_settings').upsert(up, { onConflict: ['tenant_id'] });
      processed.settings = true;
    }

    // Enqueue welcome email into a mail_outbox table if provided
    if (welcomeEmail) {
      try {
        // mail_outbox schema (recommended columns): id, tenant_id, payload_json, status, created_at
        await supabase.from('mail_outbox').insert([{ tenant_id: tenantId, payload_json: JSON.stringify(welcomeEmail), status: 'pending', created_at: new Date().toISOString() }]);
        processed.welcomeEmail = true;
      } catch (err) {
        console.warn('[sync/trigger] mail_outbox insert failed', err);
      }
    }

    // Enqueue forecast request if provided
    if (forecast) {
      try {
        await supabase.from('forecast_requests').insert([{ tenant_id: tenantId, payload_json: JSON.stringify(forecast), status: 'pending', created_at: new Date().toISOString() }]);
        processed.forecast = true;
      } catch (err) {
        console.warn('[sync/trigger] forecast_requests insert failed', err);
      }
    }

    // You can extend this handler to invoke background workers, webhook releases, or call Brevo here.

    return res.status(200).json({ ok: true, processed });
  } catch (err: any) {
    console.error('[sync/trigger] error', err);
    return res.status(500).json({ error: err?.message || 'internal error' });
  }
}
