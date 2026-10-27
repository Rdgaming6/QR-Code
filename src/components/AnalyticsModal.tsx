/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, BarChart2, Smartphone, Monitor, Tablet, Globe, Shield, RefreshCw } from 'lucide-react';
import { QRCodeRecord, QRAnalytics } from '../types.js';
import { api } from '../lib/api.js';

interface AnalyticsModalProps {
  qr: QRCodeRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ qr, isOpen, onClose }) => {
  const [analytics, setAnalytics] = useState<QRAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qr || !isOpen) return;
    setIsLoading(true);
    setError(null);
    api.getAnalytics(qr.id)
      .then((res) => {
        setAnalytics(res.analytics);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load analytics');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [qr?.id, isOpen]);

  if (!isOpen || !qr) return null;

  const maxDailyCount = analytics?.scans_by_day
    ? Math.max(...analytics.scans_by_day.map((d) => d.count), 1)
    : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Scan Analytics: {qr.name}</h3>
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                /r/{qr.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
              Target: {qr.destination_url}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy Callout */}
        <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-xs text-slate-600">
          <Shield className="w-4 h-4 text-slate-700 shrink-0" />
          <p>
            <span className="font-semibold text-slate-900">Privacy-First Analytics:</span> Full IP addresses are never recorded or stored. Unique counts are estimated via daily salted cryptographic hashes.
          </p>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
            <p className="text-xs text-slate-500">Calculating scan metrics...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-600 text-xs">
            {error}
          </div>
        ) : analytics ? (
          <div className="space-y-6 mt-4">
            
            {/* Metric Strips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Total Scans
                </span>
                <span className="text-2xl font-bold text-slate-900 font-mono-tabular mt-1 block">
                  {analytics.total_scans}
                </span>
                <span className="text-[11px] text-slate-400">All-time redirect hits</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Unique Scanners (Est.)
                </span>
                <span className="text-2xl font-bold text-emerald-600 font-mono-tabular mt-1 block">
                  {analytics.unique_scans_estimate}
                </span>
                <span className="text-[11px] text-slate-400">Distinct client fingerprints</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Active Status
                </span>
                <span className="text-2xl font-bold text-slate-900 capitalize mt-1 block">
                  {qr.status}
                </span>
                <span className="text-[11px] text-slate-400">
                  {qr.status === 'active' ? 'Routing scans via HTTP 302' : 'Scans paused'}
                </span>
              </div>
            </div>

            {/* 14-Day Timeline Bar Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Scans Past 14 Days
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Daily distribution
                </span>
              </div>

              <div className="h-32 flex items-end gap-1 sm:gap-2 pt-6">
                {analytics.scans_by_day.map((day) => {
                  const heightPercent = Math.max(Math.round((day.count / maxDailyCount) * 100), 4);
                  const isToday = day.date === new Date().toISOString().slice(0, 10);

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap z-10 font-mono">
                        {day.date}: {day.count} scans
                      </div>

                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t transition-all ${
                          isToday
                            ? 'bg-slate-900'
                            : day.count > 0
                            ? 'bg-slate-600 hover:bg-slate-800'
                            : 'bg-slate-100'
                        }`}
                      />
                      <span className="text-[10px] text-slate-400 rotate-45 sm:rotate-0 origin-left mt-1 font-mono">
                        {day.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Devices */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Scanners by Device Category
                </h4>
                {analytics.devices.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No device data yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.devices.map((d) => (
                      <div key={d.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium">{d.name}</span>
                          <span className="font-mono text-slate-500">
                            {d.count} ({d.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-900 rounded-full"
                            style={{ width: `${d.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Referrers */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Top Scanner Contexts / Referrers
                </h4>
                {analytics.referrers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No referrer data yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.referrers.map((r) => (
                      <div key={r.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium truncate max-w-[180px]">
                            {r.name}
                          </span>
                          <span className="font-mono text-slate-500">
                            {r.count} ({r.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-700 rounded-full"
                            style={{ width: `${r.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Recent Scans Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Recent Scan Logs (Latest 20)
                </h4>
              </div>

              {analytics.recent_scans.length === 0 ? (
                <p className="text-xs text-slate-400 p-6 text-center">
                  No scan events recorded yet for this QR code.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Timestamp</th>
                        <th className="py-2.5 px-4">Device</th>
                        <th className="py-2.5 px-4">Browser & OS</th>
                        <th className="py-2.5 px-4">Referrer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono-tabular">
                      {analytics.recent_scans.map((scan) => (
                        <tr key={scan.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                            {new Date(scan.scanned_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-slate-900 font-sans capitalize">
                            {scan.device_category}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-sans">
                            {scan.browser || 'Unknown'} · {scan.os || 'Unknown'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-sans truncate max-w-xs">
                            {scan.referrer || 'Direct / Camera'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        ) : null}

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
