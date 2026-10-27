/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw, CheckCircle2, Shield, Zap, ExternalLink, QrCode } from 'lucide-react';
import { renderQRToDataURL } from '../lib/qr-generator.js';

interface LandingHeroProps {
  onGetStarted: () => void;
  onOpenDocs: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onGetStarted, onOpenDocs }) => {
  // Interactive live simulator state
  const demoCode = 'demo26';
  const [destination, setDestination] = useState('https://example.com/spring-launch');
  const [pendingUrl, setPendingUrl] = useState('https://example.com/autumn-sale');
  const [qrImage, setQrImage] = useState<string>('');
  const [updateCount, setUpdateCount] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');

  useEffect(() => {
    // Generate QR with the permanent redirect URL only
    renderQRToDataURL(demoCode, {
      fgColor: '#0f172a',
      bgColor: '#ffffff',
      errorCorrection: 'Q',
    }, 380).then(setQrImage);
  }, []);

  const handleApplyUpdate = () => {
    if (!pendingUrl.trim()) return;
    setIsUpdating(true);
    setTimeout(() => {
      setDestination(pendingUrl.trim());
      setUpdateCount((c) => c + 1);
      setIsUpdating(false);
      setLastUpdated('Updated just now');
    }, 250);
  };

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Value Proposition & Storytelling */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span>Dynamic QR Infrastructure</span>
              <span aria-hidden="true">·</span>
              <span>Zero-Reprint Reliability</span>
              <span aria-hidden="true">·</span>
              <span>HTTP 302 Redirect Engine</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 text-balance leading-tight">
              Change the destination. <br className="hidden sm:inline" />
              <span className="text-slate-800">Keep the same QR code.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Print once on packaging, table tents, billboards, or business cards.
              When marketing campaigns pivot or product pages move, update the target URL in milliseconds without ever reprinting physical materials.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
              >
                Create Dynamic QR
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenDocs}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Architecture & Schema
              </button>
            </div>

            {/* Claim-to-proof adjacent metrics */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-bold text-slate-900 font-mono-tabular">0%</div>
                <div className="text-xs text-slate-500 mt-0.5">Physical reprint overhead</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 font-mono-tabular">&lt;20ms</div>
                <div className="text-xs text-slate-500 mt-0.5">Average redirect latency</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 font-mono-tabular">100%</div>
                <div className="text-xs text-slate-500 mt-0.5">QR matrix immutability</div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Dynamic Switch Simulator */}
          <div className="lg:col-span-5">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Interactive Proof Simulator</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Watch the destination change while the QR stays fixed</p>
                </div>
                <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  /r/{demoCode}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 py-6">
                {/* QR Code Container */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-40 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                    {qrImage ? (
                      <img
                        src={qrImage}
                        alt="Permanent Dynamic QR Matrix"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 font-mono">
                    Permanent Matrix (Frozen)
                  </span>
                </div>

                {/* Routing status details */}
                <div className="flex-1 w-full space-y-3">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Current Target URL
                    </div>
                    <div className="text-xs font-mono text-slate-900 bg-white p-2 rounded border border-slate-200 truncate mt-1">
                      {destination}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Database Updates
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700 mt-1">
                      <span className="font-mono-tabular font-semibold">{updateCount} times updated</span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span className="text-slate-500">{lastUpdated}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <label className="block text-xs font-medium text-slate-700">
                  Try Updating Destination:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={pendingUrl}
                    onChange={(e) => setPendingUrl(e.target.value)}
                    placeholder="https://example.com/new-target"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    onClick={handleApplyUpdate}
                    disabled={isUpdating}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {isUpdating ? 'Saving...' : 'Update Target'}
                  </button>
                </div>

                {/* Preset quick switches */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-500">
                  <span>Presets:</span>
                  <button
                    type="button"
                    onClick={() => setPendingUrl('https://example.com/summer-specials')}
                    className="underline hover:text-slate-900 cursor-pointer"
                  >
                    Summer Menu
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setPendingUrl('https://app.apple.com/us/app/example')}
                    className="underline hover:text-slate-900 cursor-pointer"
                  >
                    App Store
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setPendingUrl('https://instagram.com/mybusiness')}
                    className="underline hover:text-slate-900 cursor-pointer"
                  >
                    Social Links
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
