/**
 * Cloudflare Pages Function: Permanent Dynamic QR Redirect
 * Route: GET /r/:code
 * 
 * Runs at Cloudflare Edge locations worldwide with <15ms latency.
 * Issues HTTP 302 redirect with no-store cache control so destination
 * changes take effect immediately without browser caching.
 */

interface Env {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  QR_KV?: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const code = context.params.code as string;
  const env = context.env;
  const request = context.request;

  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  let destinationUrl: string | null = null;
  let qrName: string | null = null;
  let qrStatus: 'active' | 'paused' = 'active';
  let qrId: string | null = null;

  // 1. Try Cloudflare D1 Database if bound
  if (env.DB) {
    try {
      const row = await env.DB.prepare(
        'SELECT id, name, destination_url, status FROM qr_codes WHERE code = ?'
      ).bind(code).first<{ id: string; name: string; destination_url: string; status: string }>();

      if (row) {
        qrId = row.id;
        qrName = row.name;
        destinationUrl = row.destination_url;
        qrStatus = row.status as any;
      }
    } catch (err) {
      console.error('D1 lookup error:', err);
    }
  }

  // 2. Try Supabase REST API if configured in Cloudflare environment variables
  if (!destinationUrl && env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/qr_codes?code=eq.${encodeURIComponent(code)}&select=id,name,destination_url,status`,
        {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (res.ok) {
        const rows = await res.json() as any[];
        if (rows && rows.length > 0) {
          qrId = rows[0].id;
          qrName = rows[0].name;
          destinationUrl = rows[0].destination_url;
          qrStatus = rows[0].status;
        }
      }
    } catch (err) {
      console.error('Supabase lookup error:', err);
    }
  }

  // 3. Try Cloudflare KV if bound
  if (!destinationUrl && env.QR_KV) {
    try {
      const kvData = await env.QR_KV.get(code, 'json') as any;
      if (kvData) {
        destinationUrl = kvData.destination_url;
        qrName = kvData.name;
        qrStatus = kvData.status || 'active';
      }
    } catch (err) {
      console.error('KV lookup error:', err);
    }
  }

  // Case 1: QR not found
  if (!destinationUrl) {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Code Not Found - FluxQR</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px 28px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          h1 { font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #f1f5f9; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
          .badge { display: inline-block; padding: 4px 12px; background: #334155; border-radius: 9999px; font-family: monospace; font-size: 13px; color: #cbd5e1; margin-bottom: 20px; }
          .btn { display: inline-block; background: #38bdf8; color: #0f172a; font-weight: 600; font-size: 14px; text-decoration: none; padding: 10px 24px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Code: ${code}</div>
          <h1>QR Code Not Found</h1>
          <p>This dynamic QR code does not exist or has been deleted by its owner.</p>
          <a href="/" class="btn">Go to FluxQR</a>
        </div>
      </body>
      </html>`,
      {
        status: 404,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          ...noCacheHeaders,
        },
      }
    );
  }

  // Case 2: QR is paused
  if (qrStatus === 'paused') {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Code Temporarily Paused - FluxQR</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px 28px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .icon { width: 48px; height: 48px; margin: 0 auto 16px; background: rgba(245, 158, 11, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #f59e0b; font-size: 24px; }
          h1 { font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #f1f5f9; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
          .qr-name { font-weight: 600; color: #e2e8f0; }
          .btn { display: inline-block; background: #334155; color: #f8fafc; font-weight: 500; font-size: 14px; text-decoration: none; padding: 10px 24px; border-radius: 8px; border: 1px solid #475569; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⏸</div>
          <h1>QR Code Paused</h1>
          <p><span class="qr-name">"${qrName || code}"</span> is currently paused by its administrator.</p>
          <a href="/r/${code}" class="btn">Retry Scan</a>
        </div>
      </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          ...noCacheHeaders,
        },
      }
    );
  }

  // Non-blocking background scan analytics recording on Cloudflare Edge
  if (env.DB && qrId) {
    context.waitUntil(
      (async () => {
        try {
          const userAgent = request.headers.get('user-agent') || '';
          const referrer = request.headers.get('referer') || '';
          let dev = 'desktop';
          if (userAgent.toLowerCase().includes('mobile')) dev = 'mobile';
          else if (userAgent.toLowerCase().includes('tablet') || userAgent.toLowerCase().includes('ipad')) dev = 'tablet';

          await env.DB!.prepare(`
            INSERT INTO scans (id, qr_code_id, scanned_at, referrer, device_category, browser, os)
            VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
          `).bind(crypto.randomUUID(), qrId, referrer.slice(0, 255), dev, 'Edge Browser', 'Cloudflare Edge').run();
        } catch (e) {
          console.error('Analytics log error on edge:', e);
        }
      })()
    );
  }

  // Case 3: HTTP 302 Found redirect with Location header AND instant HTML meta-refresh fallback
  const safeDest = destinationUrl.replace(/"/g, '&quot;');
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${safeDest}">
  <title>Redirecting...</title>
  <script>window.location.replace(${JSON.stringify(destinationUrl)});</script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 48px 20px; background: #0f172a; color: #f8fafc;">
  <p style="font-size: 15px; margin-bottom: 12px;">Redirecting you to destination...</p>
  <p style="font-size: 13px; color: #94a3b8;"><a href="${safeDest}" style="color: #38bdf8; text-decoration: underline;">Click here if not redirected automatically</a></p>
</body>
</html>`,
    {
      status: 302,
      headers: {
        'Location': destinationUrl,
        'Content-Type': 'text/html;charset=UTF-8',
        ...noCacheHeaders,
      },
    }
  );
};
