/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRStyle {
  fgColor: string;
  bgColor: string;
  size: number;
  errorCorrection: ErrorCorrectionLevel;
  logoData?: string; // base64 data url or svg icon name
  logoSize?: number; // percentage of qr size (10-25%)
  dotStyle?: 'square' | 'rounded' | 'dots';
}

export type QRStatus = 'active' | 'paused';

export interface QRCodeRecord {
  id: string;
  user_id: string;
  code: string; // The permanent unique random public identifier (e.g. "x8k2m9p")
  name: string;
  description: string | null;
  destination_url: string; // The mutable target URL (http/https)
  status: QRStatus;
  qr_style: QRStyle;
  scan_count: number;
  created_at: string;
  updated_at: string;
}

export type DeviceCategory = 'mobile' | 'desktop' | 'tablet' | 'bot' | 'unknown';

export interface ScanRecord {
  id: string;
  qr_code_id: string;
  scanned_at: string;
  referrer: string | null;
  device_category: DeviceCategory;
  browser: string | null;
  os: string | null;
}

export interface DayScanStat {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface CategoryStat {
  name: string;
  count: number;
  percentage: number;
}

export interface QRAnalytics {
  qr_id: string;
  total_scans: number;
  unique_scans_estimate: number;
  scans_by_day: DayScanStat[];
  devices: CategoryStat[];
  referrers: CategoryStat[];
  recent_scans: ScanRecord[];
}

export interface DashboardStats {
  total_qrs: number;
  active_qrs: number;
  paused_qrs: number;
  total_scans: number;
  scans_last_7_days: number;
}

export interface TestResult {
  id: string;
  title: string;
  scenario: string;
  passed: boolean;
  details: string;
  duration_ms: number;
}
