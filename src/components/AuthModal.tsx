/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Sparkles, AlertCircle, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { User } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login('demo@fluxqr.com', 'password123');
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email.trim(), password);
        onSuccess(res.user);
        onClose();
      } else if (mode === 'register') {
        const res = await api.register(email.trim(), password, name.trim());
        onSuccess(res.user);
        onClose();
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email.trim());
        setNotice(res.message);
        if (res.reset_token) {
          setResetToken(res.reset_token);
          setMode('reset');
        }
      } else if (mode === 'reset') {
        await api.resetPassword(resetToken.trim(), newPassword);
        setNotice('Password reset successfully! Please log in with your new password.');
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {mode === 'login' && 'Sign in to FluxQR'}
              {mode === 'register' && 'Create your SaaS account'}
              {mode === 'forgot' && 'Reset your password'}
              {mode === 'reset' && 'Set new password'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure authentication with user-isolated dynamic QR codes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Demo Login Banner */}
        <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900 block">Instant Demo Access</span>
            <span className="text-[11px] text-slate-500">demo@fluxqr.com / password123</span>
          </div>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shrink-0 shadow-2xs"
          >
            1-Click Demo
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
            <Check className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>
            </div>
          )}

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-slate-500 hover:text-slate-900 underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading
              ? 'Processing...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
              ? 'Create Account'
              : mode === 'forgot'
              ? 'Send Reset Link'
              : 'Update Password'}
          </button>
        </form>

        {/* Footer switcher */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-semibold text-slate-900 hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-semibold text-slate-900 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
