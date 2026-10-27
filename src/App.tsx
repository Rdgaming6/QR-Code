/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { LandingHero } from './components/LandingHero.js';
import { Dashboard } from './components/Dashboard.js';
import { CreateQRModal } from './components/CreateQRModal.js';
import { QREditModal } from './components/QREditModal.js';
import { AnalyticsModal } from './components/AnalyticsModal.js';
import { TestSuiteModal } from './components/TestSuiteModal.js';
import { DeploymentDocsModal } from './components/DeploymentDocsModal.js';
import { User, QRCodeRecord, DashboardStats, QRStyle } from './types.js';
import { api, authStorage } from './lib/api.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'tests' | 'docs'>('dashboard');
  
  // Dashboard Data
  const [qrs, setQrs] = useState<QRCodeRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCodeRecord | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load default free workspace user immediately on mount
  useEffect(() => {
    const freeUser = authStorage.getUser();
    setUser(freeUser);
  }, []);

  // Load user QRs and stats
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [qrData, statsData] = await Promise.all([
        api.listQRs({
          search: searchQuery,
          status: statusFilter,
          sortBy,
          sortOrder: 'desc',
        }),
        api.getDashboardStats().catch(() => null),
      ]);
      setQrs(qrData.qrs);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, searchQuery, statusFilter, sortBy]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    } else {
      setQrs([]);
      setStats(null);
    }
  }, [user, loadDashboardData]);

  const handleCreateQR = async (data: {
    name: string;
    destination_url: string;
    description?: string;
    qr_style: QRStyle;
  }) => {
    const res = await api.createQR(data);
    showToast(`Dynamic QR "${res.qr.name}" created! Permanent code: ${res.qr.code}`);
    loadDashboardData();
  };

  const handleUpdateQR = async (
    id: string,
    updates: { destination_url: string; name?: string; description?: string }
  ) => {
    const res = await api.updateQR(id, updates);
    setSelectedQR(res.qr);
    showToast('Destination updated! QR code image remains identical.');
    loadDashboardData();
  };

  const handleToggleStatus = async (qr: QRCodeRecord) => {
    const nextStatus = qr.status === 'active' ? 'paused' : 'active';
    const res = await api.toggleStatus(qr.id, nextStatus);
    showToast(`QR Code status updated to ${nextStatus}.`);
    loadDashboardData();
  };

  const handleDeleteQR = async (qr: QRCodeRecord) => {
    if (window.confirm(`Are you sure you want to permanently delete "${qr.name}"? Scanners of this code will receive a 404 response.`)) {
      await api.deleteQR(qr.id);
      showToast(`QR Code "${qr.name}" deleted.`);
      loadDashboardData();
    }
  };

  const handleTabSelect = (tab: 'dashboard' | 'create' | 'tests' | 'docs') => {
    setActiveTab(tab);
    if (tab === 'create') {
      setIsCreateOpen(true);
    } else if (tab === 'tests') {
      setIsTestOpen(true);
    } else if (tab === 'docs') {
      setIsDocsOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Contract Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onSelectTab={handleTabSelect}
        onOpenAuth={() => setIsCreateOpen(true)}
        onLogout={() => {}}
        onQuickCreate={() => setIsCreateOpen(true)}
      />

      {/* Interactive Hero Section */}
      <LandingHero
        onGetStarted={() => setIsCreateOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              QR Code Management Console
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your dynamic QR fleet, monitor real-time scans, and redirect destinations on the fly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTestOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Run Test Suite
            </button>
            <button
              onClick={() => setIsDocsOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Supabase Docs
            </button>
          </div>
        </div>

        {/* Dashboard Body */}
        <Dashboard
          stats={stats}
          qrs={qrs}
          isLoading={isLoading}
          onRefresh={loadDashboardData}
          onOpenCreate={() => setIsCreateOpen(true)}
          onOpenEdit={(qr) => {
            setSelectedQR(qr);
            setIsEditOpen(true);
          }}
          onOpenAnalytics={(qr) => {
            setSelectedQR(qr);
            setIsAnalyticsOpen(true);
          }}
          onToggleStatus={handleToggleStatus}
          onDeleteQR={handleDeleteQR}
          onOpenTestSuite={() => setIsTestOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <span>FluxQR</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-slate-500 font-normal">Production Dynamic QR Code Infrastructure</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsDocsOpen(true)} className="hover:text-slate-900 transition-colors">
              Supabase Schema
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button onClick={() => setIsTestOpen(true)} className="hover:text-slate-900 transition-colors">
              Acceptance Tests
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>HTTP 302 Non-Caching Redirects</span>
          </div>
        </div>
      </footer>

      {/* Modals - conditionally mounted to maintain clean hook lifecycle in React 19 */}
      {isCreateOpen && (
        <CreateQRModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateQR}
        />
      )}

      {isEditOpen && selectedQR && (
        <QREditModal
          qr={selectedQR}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onUpdate={handleUpdateQR}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {isAnalyticsOpen && selectedQR && (
        <AnalyticsModal
          qr={selectedQR}
          isOpen={isAnalyticsOpen}
          onClose={() => setIsAnalyticsOpen(false)}
        />
      )}

      {isTestOpen && (
        <TestSuiteModal
          isOpen={isTestOpen}
          onClose={() => setIsTestOpen(false)}
        />
      )}

      {isDocsOpen && (
        <DeploymentDocsModal
          isOpen={isDocsOpen}
          onClose={() => setIsDocsOpen(false)}
        />
      )}
    </div>
  );
}
