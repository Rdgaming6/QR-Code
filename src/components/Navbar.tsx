/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { QrCode, Sparkles, ShieldCheck, Database, LogOut, User as UserIcon, Plus } from 'lucide-react';
import { User } from '../types.js';

interface NavbarProps {
  user: User | null;
  activeTab: 'dashboard' | 'create' | 'tests' | 'docs';
  onSelectTab: (tab: 'dashboard' | 'create' | 'tests' | 'docs') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onQuickCreate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onOpenAuth,
  onLogout,
  onQuickCreate,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              FluxQR
            </span>
          </div>

          {/* Zone 2: 4–5 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard' ? 'text-slate-900 font-semibold' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onSelectTab('create')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'create' ? 'text-slate-900 font-semibold' : ''
              }`}
            >
              QR Studio
            </button>
            <button
              onClick={() => onSelectTab('tests')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'tests' ? 'text-slate-900 font-semibold' : ''
              }`}
            >
              Test Suite
            </button>
            <button
              onClick={() => onSelectTab('docs')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'docs' ? 'text-slate-900 font-semibold' : ''
              }`}
            >
              Supabase & Architecture
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-flex text-[11px] text-slate-500 font-medium">
              Free · No Account Needed
            </span>

            <button
              onClick={onQuickCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Dynamic QR
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
