/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Play,
  Pause,
  Edit3,
  BarChart2,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowUpDown,
  Smartphone
} from 'lucide-react';
import { QRCodeRecord, DashboardStats } from '../types.js';
import { renderQRToDataURL, downloadFile, renderQRToSVG, getPermanentRedirectUrl } from '../lib/qr-generator.js';

interface DashboardProps {
  stats: DashboardStats | null;
  qrs: QRCodeRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (qr: QRCodeRecord) => void;
  onOpenAnalytics: (qr: QRCodeRecord) => void;
  onToggleStatus: (qr: QRCodeRecord) => void;
  onDeleteQR: (qr: QRCodeRecord) => void;
  onOpenTestSuite: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  sortBy: string;
  onSortByChange: (s: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  qrs,
  isLoading,
  onRefresh,
  onOpenCreate,
  onOpenEdit,
  onOpenAnalytics,
  onToggleStatus,
  onDeleteQR,
  onOpenTestSuite,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [qrThumbnails, setQrThumbnails] = useState<Record<string, string>>({});

  // Render thumbnails for active list
  useEffect(() => {
    qrs.forEach((qr) => {
      if (!qrThumbnails[qr.id]) {
        renderQRToDataURL(qr.code, qr.qr_style, 180).then((url) => {
          setQrThumbnails((prev) => ({ ...prev, [qr.id]: url }));
        });
      }
    });
  }, [qrs]);

  const handleCopy = (code: string) => {
    const url = getPermanentRedirectUrl(code);
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleQuickDownload = async (qr: QRCodeRecord, format: 'png' | 'svg') => {
    if (format === 'png') {
      const dataUrl = await renderQRToDataURL(qr.code, qr.qr_style, 1024);
      downloadFile(dataUrl, `${qr.name.toLowerCase().replace(/\s+/g, '_')}_qr.png`, true);
    } else {
      const svg = await renderQRToSVG(qr.code, qr.qr_style, 512);
      downloadFile(svg, `${qr.name.toLowerCase().replace(/\s+/g, '_')}_qr.svg`, false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Dashboard Metric Header */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Dynamic QRs</div>
            <div className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">{stats.total_qrs}</div>
            <div className="text-xs text-slate-400 mt-1">
              <span>{stats.active_qrs} active</span> · <span>{stats.paused_qrs} paused</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Redirects</div>
            <div className="text-2xl font-bold text-emerald-600 font-mono-tabular mt-1">{stats.active_qrs}</div>
            <div className="text-xs text-slate-400 mt-1">Serving HTTP 302 lookups</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Scans</div>
            <div className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">{stats.total_scans}</div>
            <div className="text-xs text-slate-400 mt-1">Logged across all codes</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last 7 Days</div>
            <div className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1">{stats.scans_last_7_days}</div>
            <div className="text-xs text-slate-400 mt-1">Recent scanner engagement</div>
          </div>
        </div>
      )}

      {/* 2. Toolbar & Filtering Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, URL, or code..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => onStatusFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stats?.total_qrs || 0})
            </button>
            <button
              onClick={() => onStatusFilterChange('active')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({stats?.active_qrs || 0})
            </button>
            <button
              onClick={() => onStatusFilterChange('paused')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'paused' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paused ({stats?.paused_qrs || 0})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="text-xs bg-transparent border-none text-slate-700 focus:outline-none pr-1"
            >
              <option value="created">Newest</option>
              <option value="scans">Most Scans</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>

          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create QR
          </button>
        </div>
      </div>

      {/* 3. QR Codes List / Cards */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading dynamic QR codes...</p>
        </div>
      ) : qrs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mx-auto mb-4">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No dynamic QR codes found</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {searchQuery
              ? 'No QR codes matched your search query. Try clearing your search filter.'
              : 'Create your first dynamic QR code. Print it once on any physical collateral, and update the destination anytime.'}
          </p>
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Dynamic QR
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {qrs.map((qr) => {
            const isPaused = qr.status === 'paused';
            const permUrl = getPermanentRedirectUrl(qr.code);

            return (
              <div
                key={qr.id}
                className={`bg-white rounded-xl border transition-all p-5 ${
                  isPaused ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-lg p-1 shrink-0 flex items-center justify-center">
                      {qrThumbnails[qr.id] ? (
                        <img
                          src={qrThumbnails[qr.id]}
                          alt={qr.name}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{qr.name}</h4>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            isPaused ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isPaused ? 'Paused' : 'Active'}
                        </span>
                      </div>

                      {qr.description && (
                        <p className="text-xs text-slate-500 truncate">{qr.description}</p>
                      )}

                      {/* Permanent URL & Target mapping */}
                      <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                        <div className="flex items-center gap-1 font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          <span className="text-slate-400">/r/{qr.code}</span>
                          <button
                            onClick={() => handleCopy(qr.code)}
                            title="Copy permanent redirect link"
                            className="text-slate-400 hover:text-slate-700 ml-1"
                          >
                            {copiedCode === qr.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <span className="text-slate-400">→</span>

                        <span className="font-mono text-slate-900 truncate max-w-[240px] lg:max-w-[360px]" title={qr.destination_url}>
                          {qr.destination_url}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Scans & Date */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-xs text-slate-500 shrink-0 gap-1 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-tabular font-bold text-slate-900 text-sm">
                        {qr.scan_count}
                      </span>
                      <span>scans</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Created {new Date(qr.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => onOpenEdit(qr)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Target
                    </button>

                    <button
                      onClick={() => onOpenAnalytics(qr)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      title="View Analytics"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>

                    <div className="relative group">
                      <button
                        className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Download QR"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 bottom-full mb-1 hidden group-hover:flex flex-col bg-slate-900 text-white rounded-lg p-1 text-xs shadow-lg z-20 min-w-[100px]">
                        <button
                          onClick={() => handleQuickDownload(qr, 'png')}
                          className="px-2 py-1 text-left hover:bg-slate-800 rounded"
                        >
                          PNG (1024px)
                        </button>
                        <button
                          onClick={() => handleQuickDownload(qr, 'svg')}
                          className="px-2 py-1 text-left hover:bg-slate-800 rounded"
                        >
                          SVG (Vector)
                        </button>
                      </div>
                    </div>

                    <a
                      href={permUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center"
                      title="Test live redirect in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => onToggleStatus(qr)}
                      className={`p-1.5 border rounded-lg transition-colors ${
                        isPaused
                          ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                          : 'text-amber-700 border-amber-200 hover:bg-amber-50'
                      }`}
                      title={isPaused ? 'Resume QR' : 'Pause QR'}
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => onDeleteQR(qr)}
                      className="p-1.5 text-rose-600 hover:text-rose-700 border border-slate-200 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete QR"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
