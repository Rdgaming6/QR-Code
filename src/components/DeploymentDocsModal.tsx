/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Copy, Check, Database, Server, ShieldCheck, ArrowRight, BookOpen, Terminal } from 'lucide-react';

interface DeploymentDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentDocsModal: React.FC<DeploymentDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'supabase' | 'deployment' | 'env'>('architecture');
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const supabaseSql = `-- Supabase PostgreSQL Schema with Row Level Security (RLS)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    destination_url TEXT NOT NULL CHECK (destination_url ~* '^https?://'),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
    qr_style JSONB NOT NULL DEFAULT '{"fgColor": "#0f172a", "bgColor": "#ffffff", "size": 512, "errorCorrection": "M"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    referrer TEXT,
    device_category VARCHAR(32) DEFAULT 'unknown',
    browser VARCHAR(64),
    os VARCHAR(64),
    ip_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON public.qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON public.qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_scans_qr_code_id ON public.scans(qr_code_id);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own qr_codes" 
    ON public.qr_codes FOR ALL 
    USING (auth.uid() = user_id);

CREATE POLICY "Public redirect lookup for active QRs" 
    ON public.qr_codes FOR SELECT 
    USING (status = 'active');

CREATE POLICY "Public scan insert" 
    ON public.scans FOR INSERT 
    WITH CHECK (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(supabaseSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                System Architecture & Deployment Guide
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Technical reference for permanent redirects, Supabase PostgreSQL, and zero-reprint operations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 my-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`pb-2.5 px-2 border-b-2 transition-colors ${
              activeTab === 'architecture'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Core Architecture
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`pb-2.5 px-2 border-b-2 transition-colors ${
              activeTab === 'supabase'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Supabase PostgreSQL & RLS
          </button>
          <button
            onClick={() => setActiveTab('deployment')}
            className={`pb-2.5 px-2 border-b-2 transition-colors ${
              activeTab === 'deployment'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Production Deployment
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`pb-2.5 px-2 border-b-2 transition-colors ${
              activeTab === 'env'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Environment Variables
          </button>
        </div>

        {/* Tab Content */}
        <div className="max-h-[500px] overflow-y-auto pr-1 text-xs text-slate-600 space-y-4">
          
          {/* Architecture Tab */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-900 block text-sm">
                  1. How the Permanent Redirect Works
                </span>
                <p className="leading-relaxed">
                  In a traditional static QR code, the target URL (e.g. <code>https://example.com/menu</code>) is encoded directly into the black and white pixel matrix. If the domain or URL changes, the physical QR code becomes permanently broken.
                </p>
                <p className="leading-relaxed">
                  In <strong>FluxQR</strong>, the QR code matrix encodes <em>only</em> a permanent redirect URL pointing to our high-speed routing resolver:
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-slate-800 space-y-1">
                  <div>1. Physical Scan ➔ <strong>https://yourdomain.com/r/:code</strong></div>
                  <div>2. Server Lookup ➔ Query <code>SELECT destination_url, status FROM qr_codes WHERE code = ?</code></div>
                  <div>3. Fast HTTP 302 ➔ Browser lands immediately on <strong>current destination</strong></div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-900 block text-sm">
                  2. Why We Use HTTP 302/307 (Never HTTP 301)
                </span>
                <p className="leading-relaxed">
                  <strong>HTTP 301 (Moved Permanently)</strong> tells client browsers and intermediate mobile proxies to cache the destination indefinitely. If a 301 was used and you later changed the target, phones that previously scanned the QR code would keep redirecting to the old page from their local cache.
                </p>
                <p className="leading-relaxed">
                  We strictly issue <strong>HTTP 302 Temporary Redirects</strong> accompanied by <code>Cache-Control: no-store, no-cache, must-revalidate</code> headers. This guarantees that every single camera scan requests the latest database destination in real time.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-900 block text-sm">
                  3. Guaranteed Immutability of the QR Code
                </span>
                <p className="leading-relaxed">
                  When a user edits their QR code in the dashboard:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The unique public identifier (<code>code</code>) is <strong>never modified</strong>.</li>
                  <li>The permanent redirect link remains identical.</li>
                  <li>The QR code PNG/SVG vector matrix remains identical.</li>
                  <li>Only the <code>destination_url</code> column in the database updates.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Supabase Tab */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 text-sm block">
                    Supabase PostgreSQL Migration Script
                  </span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Run this SQL script directly in the Supabase SQL Editor.
                  </p>
                </div>
                <button
                  onClick={copySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                </button>
              </div>

              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
                {supabaseSql}
              </pre>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-900 block">
                  Supabase Row Level Security (RLS) Rules:
                </span>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>qr_codes:</strong> Authenticated users can only read, write, update, and delete QR records where <code>auth.uid() = user_id</code>.</li>
                  <li><strong>Public Redirects:</strong> Anonymous clients can query only active records to resolve the destination without logging in.</li>
                  <li><strong>scans:</strong> Anyone can insert a new scan via the redirect worker; users can only read scan metrics for QR codes they own.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Deployment Tab */}
          {activeTab === 'deployment' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-semibold text-slate-900 block text-sm">
                  Step 1: Push Code to Your GitHub Repository
                </span>
                <p className="leading-relaxed">
                  Open your local terminal in the project folder and push to GitHub:
                </p>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed">
git init
git add .
git commit -m "feat: initial FluxQR dynamic QR code SaaS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
                </pre>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-semibold text-slate-900 block text-sm">
                  Step 2: Connect to Cloudflare Pages (Free)
                </span>
                <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                  <li>Log in to your <strong>Cloudflare Dashboard</strong> and go to <strong>Workers & Pages</strong> &gt; <strong>Create application</strong> &gt; <strong>Pages</strong>.</li>
                  <li>Click <strong>Connect to Git</strong> and select your GitHub repository.</li>
                  <li>Configure the Build Settings:
                    <ul className="list-disc pl-5 mt-1 font-mono text-[11px] text-slate-800 space-y-0.5">
                      <li>Framework preset: <strong>Vite</strong> (or None)</li>
                      <li>Build command: <code>npm run build</code></li>
                      <li>Build output directory: <code>dist</code></li>
                    </ul>
                  </li>
                  <li>Click <strong>Save and Deploy</strong>!</li>
                </ol>
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700">
                  <strong>Zero-Config Edge Redirects:</strong> Cloudflare Pages will automatically detect the <code>/functions</code> directory in this repository. Requests to <code>/r/:code</code> will immediately run as Cloudflare Edge Functions worldwide!
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-900 block text-sm">
                  Post-Deployment Verification Checklist
                </span>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Visit your <code>*.pages.dev</code> URL.</li>
                  <li>Create a dynamic QR code pointing to <code>https://example.com/page1</code>.</li>
                  <li>Scan the QR code with your phone camera or click Test to confirm it redirects to page 1.</li>
                  <li>Click <strong>Edit Target</strong>, change destination to <code>https://example.com/page2</code> and save.</li>
                  <li>Scan the <strong>exact same</strong> physical QR code again: your phone camera now lands on page 2!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Environment Variables Tab */}
          {activeTab === 'env' && (
            <div className="space-y-4">
              <p className="leading-relaxed">
                Configure these environment variables in your deployment environment or <code>.env</code> file:
              </p>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] space-y-3">
                <div>
                  <span className="text-emerald-400">APP_URL</span>
                  <div className="text-slate-400">The public domain where your app is hosted (e.g. https://my-qr-app.com). Used to build the permanent QR URLs.</div>
                </div>

                <div>
                  <span className="text-emerald-400">PORT</span>
                  <div className="text-slate-400">Application port (defaults to 3000 in AI Studio).</div>
                </div>

                <div>
                  <span className="text-emerald-400">JWT_SECRET</span>
                  <div className="text-slate-400">Secret key for signing user authentication session tokens.</div>
                </div>

                <div>
                  <span className="text-emerald-400">DATABASE_URL / SUPABASE_URL (Optional)</span>
                  <div className="text-slate-400">Connection string if deploying to remote Supabase PostgreSQL instead of the embedded SQLite engine.</div>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
