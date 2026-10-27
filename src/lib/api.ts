/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, QRCodeRecord, QRAnalytics, DashboardStats, TestResult, QRStyle } from '../types.js';

const TOKEN_KEY = 'fluxqr_auth_token';
const USER_KEY = 'fluxqr_user_profile';

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setSession(token: string, user: User) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to store session:', e);
    }
  },
  getUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      if (data) return JSON.parse(data);
      // Default to free public user - zero login required
      const freeUser: User = {
        id: 'public_free_user',
        email: 'free@fluxqr.com',
        name: 'Free Workspace',
        created_at: new Date().toISOString(),
      };
      return freeUser;
    } catch {
      return {
        id: 'public_free_user',
        email: 'free@fluxqr.com',
        name: 'Free Workspace',
        created_at: new Date().toISOString(),
      };
    }
  },
  clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  },
};

async function fetchWithAuth<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});
  
  headers.set('x-workspace-id', 'public_free_user');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401) {
    authStorage.clearSession();
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Auth
  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    const data = await fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    authStorage.setSession(data.token, data.user);
    return data;
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    authStorage.setSession(data.token, data.user);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    return fetchWithAuth('/api/auth/me');
  },

  async forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
    return fetchWithAuth('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, new_password: string): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    });
  },

  logout() {
    authStorage.clearSession();
  },

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    return fetchWithAuth('/api/dashboard/stats');
  },

  // QR Codes
  async listQRs(params?: { search?: string; status?: string; sortBy?: string; sortOrder?: string }): Promise<{ qrs: QRCodeRecord[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    
    return fetchWithAuth(`/api/qr?${query.toString()}`);
  },

  async getQR(id: string): Promise<{ qr: QRCodeRecord }> {
    return fetchWithAuth(`/api/qr/${id}`);
  },

  async createQR(data: {
    name: string;
    destination_url: string;
    description?: string;
    qr_style?: Partial<QRStyle>;
  }): Promise<{ qr: QRCodeRecord }> {
    return fetchWithAuth('/api/qr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateQR(id: string, updates: {
    name?: string;
    destination_url?: string;
    description?: string;
    status?: 'active' | 'paused';
    qr_style?: Partial<QRStyle>;
  }): Promise<{ qr: QRCodeRecord; message: string }> {
    return fetchWithAuth(`/api/qr/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async toggleStatus(id: string, status: 'active' | 'paused'): Promise<{ qr: QRCodeRecord }> {
    return fetchWithAuth(`/api/qr/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteQR(id: string): Promise<{ success: boolean }> {
    return fetchWithAuth(`/api/qr/${id}`, {
      method: 'DELETE',
    });
  },

  async getAnalytics(id: string): Promise<{ analytics: QRAnalytics }> {
    return fetchWithAuth(`/api/qr/${id}/analytics`);
  },

  // Test Suite
  async runTestSuite(): Promise<{ total_tests: number; passed_tests: number; results: TestResult[] }> {
    return fetchWithAuth('/api/system/run-test-suite', {
      method: 'POST',
    });
  },
};
