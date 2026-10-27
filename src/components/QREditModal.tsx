/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Download,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
} from 'lucide-react';
import { QRCodeRecord } from '../types.js';
import {
  renderQRToDataURL,
  renderQRToSVG,
  downloadFile,
  getPermanentRedirectUrl,
} from '../lib/qr-generator.js';

interface QREditModalProps {
  qr: QRCodeRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: { destination_url: string; name?: string; description?: string }
  ) => Promise<void>;
  onToggleStatus: (qr: QRCodeRecord) => void;
}

export const QREditModal: React.FC<QREditModalProps> = ({
  qr,
  isOpen,
  onClose,
  onUpdate,
  onToggleStatus,
}) => {
  const [destinationUrl, setDestinationUrl] = useState(qr?.destination_url || '');
  const [name, setName] = useState(qr?.name || '');
  const [description, setDescription] = useState(qr?.description || '');
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Simulator state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState<'idle' | 'scanning' | 'redirected'>('idle');
  const [simRedirectUrl, setSimRedirectUrl] = useState<string>('');

  const permUrl = qr ? getPermanentRedirectUrl(qr.code) : '';

  useEffect(() => {
    if (!qr) return;
    setDestinationUrl(qr.destination_url);
    setName(qr.name);
    setDescription(qr.description || '');
    setSaveSuccess(false);
    setError(null);
    setSimStep('idle');

    // Render high quality QR code image
    renderQRToDataURL(qr.code, qr.qr_style, 512).then(setQrImageUrl);
  }, [qr]);

  if (!isOpen || !qr) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(permUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    let target = destinationUrl.trim();
    if (/^(javascript|data|vbscript|file):/i.test(target)) {
      setError('Unsafe protocol. Please provide a valid web URL.');
      return;
    }
    if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }

    try {
      const parsed = new URL(target);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('Destination URL must start with http:// or https://');
        return;
      }
    } catch {
      setError('Please enter a valid URL (e.g. https://example.com/page2)');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(qr.id, {
        destination_url: target,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setDestinationUrl(target);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update destination');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (format: 'png' | 'svg', size = 1024) => {
    const cleanName = qr.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (format === 'png') {
      const dataUrl = await renderQRToDataURL(qr.code, qr.qr_style, size);
      downloadFile(dataUrl, `${cleanName}_${size}px.png`, true);
    } else {
      const svg = await renderQRToSVG(qr.code, qr.qr_style, size);
      downloadFile(svg, `${cleanName}.svg`, false);
    }
  };

  const runScanSimulation = () => {
    setIsSimulating(true);
    setSimStep('scanning');
    setTimeout(() => {
      setSimRedirectUrl(qr.destination_url);
      setSimStep('redirected');
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{qr.name}</h3>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    qr.status === 'paused'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {qr.status === 'paused' ? 'Paused' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanent Public Code: <span className="font-mono text-slate-700">{qr.code}</span>
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

        {/* Immutability Guarantee Notice */}
        <div className="my-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-900 block">
              Permanent QR Stability Guaranteed
            </span>
            <p className="text-slate-500 leading-relaxed">
              The QR matrix and permanent link below will never change. When you update the destination URL, your physical prints continue working and immediately route to the new page.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
            <Check className="w-4 h-4 shrink-0" />
            <span>Destination updated successfully! Next scan will route to this new URL.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-4">
          
          {/* Left Column: QR Matrix, Downloads & Scan Simulator */}
          <div className="md:col-span-5 flex flex-col items-center bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="w-52 h-52 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt={qr.name}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
              )}
            </div>

            {/* Permanent URL badge */}
            <div className="w-full mt-4">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1 text-center">
                Permanent QR URL
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-2 rounded-lg text-xs font-mono text-slate-800">
                <span className="truncate flex-1">{permUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="Copy permanent redirect URL"
                  className="p-1 text-slate-400 hover:text-slate-800 transition-colors shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="w-full mt-4 space-y-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block text-center">
                Export Options
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload('png', 1024)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  PNG (1024)
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('svg')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  SVG (Vector)
                </button>
              </div>
            </div>

            {/* Scan Simulator Trigger */}
            <div className="w-full mt-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={runScanSimulation}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Smartphone className="w-4 h-4" />
                Simulate Camera Scan
              </button>
            </div>
          </div>

          {/* Right Column: Destination Editing Form */}
          <div className="md:col-span-7 space-y-5">
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Current Destination URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://example.com/target-page"
                    className="w-full px-3 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Change this anytime. The QR code on the left stays identical.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    QR Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(qr)}
                    className={`w-full px-3 py-2 text-xs font-medium rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 ${
                      qr.status === 'paused'
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {qr.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{qr.status === 'paused' ? 'Paused (Click to Resume)' : 'Active (Click to Pause)'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Notes / Deployment Location
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Counter stands at storefront location A"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <a
                  href={permUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test Live Link
                </a>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>

            {/* Interactive Scan Simulator Display */}
            {isSimulating && (
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2 mt-4 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                  <span>📱 Camera Scanner Simulator</span>
                  <button
                    onClick={() => setIsSimulating(false)}
                    className="hover:text-white"
                  >
                    Close
                  </button>
                </div>

                {simStep === 'scanning' ? (
                  <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-200" />
                    <span>Resolving permanent link: {permUrl}...</span>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="text-emerald-400">HTTP/1.1 302 Found</div>
                    <div className="text-slate-300">
                      Location: <span className="text-white underline">{simRedirectUrl}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Cache-Control: no-store (Client immediately follows redirect)
                    </div>
                    <div className="pt-2">
                      <a
                        href={simRedirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-slate-900 text-xs font-sans font-medium rounded hover:bg-slate-100"
                      >
                        Open Destination in New Window
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
