# FluxQR - Production-Ready Dynamic QR Code Generator SaaS

**FluxQR** is a full-stack Dynamic QR Code Generator SaaS designed for physical print, product packaging, restaurant table tents, marketing campaigns, and signage.

> **Core Value Proposition**: *Change the destination URL at any time without ever changing the physical QR code.*

---

## 1. Core Architecture & Permanent Redirect Engine

In static QR codes, the destination URL (e.g., `https://mybrand.com/spring-menu`) is encoded directly into the pixel matrix. If the destination changes, every printed flyer, poster, and acrylic stand must be scrapped and reprinted.

**FluxQR eliminates reprinting entirely by using permanent, immutable redirect URLs:**

1. **Unique Permanent Public Code**: When a dynamic QR code is created, a cryptographically random, collision-free identifier is generated (e.g., `code = "x8k2m9p"`).
2. **Permanent Encoded Content**: The QR image encodes **only** the permanent URL:
   ```
   https://YOUR_DOMAIN.com/r/x8k2m9p
   ```
   *The target URL is never encoded into the QR matrix.*
3. **High-Speed Server-Side Redirect (`GET /r/:code`)**:
   - Queries the database for the active `destination_url`.
   - Asynchronously logs privacy-conscious scan telemetry (device category, browser, referrer, salted IP hash).
   - Sends anti-caching HTTP headers:
     ```http
     Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
     Pragma: no-cache
     Expires: 0
     ```
   - Responds with an **HTTP 302 Temporary Redirect** directly to the current destination.
4. **Why HTTP 302/307 (and never 301)**:
   - `HTTP 301 (Moved Permanently)` instructs client browsers and cellular ISP gateways to aggressively cache the redirect target. If you change the destination tomorrow, users who previously scanned the QR code would continue opening the old page from browser cache.
   - `HTTP 302 (Found)` ensures that every scan triggers a fresh server-side lookup, so destination changes become active **immediately**.

---

## 2. Immutability Guarantee

When you edit a QR code's destination in the dashboard:
- The permanent public identifier (`code`) is **never changed**.
- The permanent redirect URL (`https://YOUR_DOMAIN.com/r/:code`) is **never changed**.
- The QR code matrix and downloaded images (PNG/SVG) remain **100% identical**.
- Only the `destination_url` record in the database is updated.
- The next scan instantly routes to the new destination.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Backend**: Node.js & Express server with TypeScript (`tsx`).
- **Database & Persistence**:
  - Embedded SQLite (`better-sqlite3`) with WAL mode for zero-setup local persistence and high concurrency.
  - Complete **Supabase PostgreSQL** migration script with Row Level Security (RLS) included in `supabase/migrations/20261027000000_create_qr_saas_schema.sql`.
- **QR Generation**: `qrcode` with custom color palette, error correction levels (L, M, Q, H), quiet zones, and center logo support.
- **Validation**: Zod schema validation (rejecting unsafe schemes like `javascript:`, `data:`, `file:`).
- **Privacy-Conscious Analytics**: Salted SHA-256 IP hashing (no raw IP storage), user-agent device parsing.

---

## 4. Supabase Setup Guide

To deploy this application to Supabase:

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Copy and run the migration script located at:
   ```
   supabase/migrations/20261027000000_create_qr_saas_schema.sql
   ```
4. This script sets up:
   - `qr_codes` table with URL format validation.
   - `scans` table with cascading foreign keys.
   - Indexes on `code`, `user_id`, and `scanned_at`.
   - **Row Level Security (RLS) Policies**:
     - Users can only read, write, update, and delete their own QR codes (`auth.uid() = user_id`).
     - Anonymous scanners can only query active destination URLs via public code lookup.
     - Scanners can insert scan events, but users can only read analytics for their own QR codes.
5. In your `.env` file, configure your Supabase credentials:
   ```env
   SUPABASE_URL="https://[YOUR_PROJECT_ID].supabase.co"
   SUPABASE_ANON_KEY="eyJhbGciOi..."
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"
   ```

---

## 5. GitHub & Cloudflare Pages Deployment Guide

### Step 1: Push This Code to GitHub
1. Create a new repository on [github.com](https://github.com/new).
2. In your terminal, run:
   ```bash
   git init
   git add .
   git commit -m "feat: initial FluxQR dynamic QR code SaaS"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

### Step 2: Deploy to Cloudflare Pages (Free)
1. Go to the **Cloudflare Dashboard** ([dash.cloudflare.com](https://dash.cloudflare.com)).
2. In the left navigation, click **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your newly created GitHub repository.
4. Fill in the **Build configuration**:
   - **Framework preset**: `Vite` (or None)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**.

### Why It Works Seamlessly on Cloudflare Pages:
- **Zero-Config Edge Redirects**: Cloudflare Pages automatically detects the `/functions` folder in this repository (`/functions/r/[code].ts`).
- When a user scans `https://your-site.pages.dev/r/:code`, Cloudflare's Edge network executes the function closest to the user and issues an instant **HTTP 302 redirect** with `Cache-Control: no-store`.
- The repository also includes `.github/workflows/deploy.yml` for automated CI/CD deployments on every push.

---

## 6. Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `APP_URL` | Public base domain where the app is hosted. Used to generate permanent redirect URLs. | `http://localhost:3000` |
| `PORT` | Listening server port. | `3000` |
| `JWT_SECRET` | Secret key for signing user authentication session tokens. | Pre-configured dev secret |
| `SUPABASE_URL` | *(Optional)* Supabase project URL. | None |
| `SUPABASE_ANON_KEY` | *(Optional)* Supabase public anonymous API key. | None |
| `DATABASE_URL` | *(Optional)* PostgreSQL connection string for Supabase or external DB. | Embedded SQLite |

---

## 7. Verification & Acceptance Testing

The application includes an automated test runner accessible via the **Test Suite** button in the dashboard or via `POST /api/system/run-test-suite`.

The test suite validates all 12 key scenarios:
1. **Create QR with URL A**: Creates dynamic QR with original target URL A.
2. **Permanent URL Construction**: Confirms QR payload only encodes `/r/:code`, never the destination directly.
3. **Resolve Permanent URL to URL A**: Tests that public scanning endpoint returns HTTP 302 redirecting to URL A.
4. **Update Destination to URL B**: Updates target in database without changing `code`.
5. **Resolve Same Code to New Destination URL B**: Confirms scanning the exact same code now redirects to URL B.
6. **QR Code Immutability**: Proves the permanent code, timestamp, and matrix are identical.
7. **Multi-tenant Isolation**: Proves another user cannot edit, view, or delete another user's QR codes.
8. **Malicious Scheme Rejection**: Proves `javascript:`, `data:`, and `file:` URLs are rejected.
9. **Paused QR Behavior**: Proves paused codes stop redirecting and display an inactive notice.
10. **Deleted QR Behavior**: Proves deleted codes return clean 404 responses.
11. **Analytics Resilience**: Proves that tracking failures never disrupt valid redirects.
12. **Response Latency**: Benchmarks the lookup query to ensure `<20ms` redirect performance.
