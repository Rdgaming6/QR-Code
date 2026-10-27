/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { QRCodeRecord, ScanRecord, QRAnalytics, DashboardStats, QRStyle, DeviceCategory } from '../types.js';

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'fluxqr.db');
const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    reset_token TEXT,
    reset_token_expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS qr_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    destination_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    qr_style TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    qr_code_id TEXT NOT NULL,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
    referrer TEXT,
    device_category TEXT NOT NULL DEFAULT 'unknown',
    browser TEXT,
    os TEXT,
    ip_hash TEXT,
    FOREIGN KEY(qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
  CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
  CREATE INDEX IF NOT EXISTS idx_scans_qr_code_id ON scans(qr_code_id);
  CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);
`);

// Simple crypto-based password hasher
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

// Generate random URL-safe alphanumeric code (non-guessable, 7 characters)
export function generateRandomCode(length = 7): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

// User Management
export function findUserByEmail(email: string) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email.trim().toLowerCase()) as any;
}

export function getUserById(id: string) {
  const stmt = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?');
  return stmt.get(id) as any;
}

export function createUser(email: string, passwordPlain: string, name: string) {
  const id = crypto.randomUUID();
  const password_hash = hashPassword(passwordPlain);
  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, email.trim().toLowerCase(), password_hash, name.trim());
  return getUserById(id);
}

export function createPasswordResetToken(email: string): string | null {
  const user = findUserByEmail(email);
  if (!user) return null;
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour
  const stmt = db.prepare(`
    UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?
  `);
  stmt.run(token, expiresAt, user.id);
  return token;
}

export function resetPasswordWithToken(token: string, newPasswordPlain: string): boolean {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    SELECT * FROM users WHERE reset_token = ? AND reset_token_expires_at > ?
  `);
  const user = stmt.get(token, now) as any;
  if (!user) return false;

  const newHash = hashPassword(newPasswordPlain);
  const updateStmt = db.prepare(`
    UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?
  `);
  updateStmt.run(newHash, user.id);
  return true;
}

export function ensureUserExists(userId: string, name = 'Free User') {
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, name)
    VALUES (?, ?, '', ?)
  `).run(userId, `${userId.toLowerCase()}@fluxqr.local`, name);
}

// Seed Free Public User
function seedDatabase() {
  ensureUserExists('public_free_user', 'Public Free Workspace');
}

seedDatabase();

// Format QR row
function formatQRRow(row: any): QRCodeRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    code: row.code,
    name: row.name,
    description: row.description || null,
    destination_url: row.destination_url,
    status: row.status,
    qr_style: typeof row.qr_style === 'string' ? JSON.parse(row.qr_style) : row.qr_style,
    scan_count: row.scan_count !== undefined ? Number(row.scan_count) : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// QR Code Queries
export function listUserQRCodes(
  userId: string,
  options: { search?: string; status?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
): QRCodeRecord[] {
  const isPublicUser = userId === 'public_free_user';
  let query = `
    SELECT q.*, COUNT(s.id) as scan_count
    FROM qr_codes q
    LEFT JOIN scans s ON s.qr_code_id = q.id
    WHERE ${isPublicUser ? "(q.user_id = ? OR q.user_id = 'usr_demo_founder_2026')" : 'q.user_id = ?'}
  `;
  const params: any[] = [userId];

  if (options.status && (options.status === 'active' || options.status === 'paused')) {
    query += ` AND q.status = ?`;
    params.push(options.status);
  }

  if (options.search && options.search.trim()) {
    query += ` AND (q.name LIKE ? OR q.destination_url LIKE ? OR q.description LIKE ? OR q.code LIKE ?)`;
    const searchParam = `%${options.search.trim()}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  query += ` GROUP BY q.id`;

  // Sorting
  const sortCol = options.sortBy === 'name' ? 'q.name' :
                 options.sortBy === 'scans' ? 'scan_count' :
                 options.sortBy === 'updated' ? 'q.updated_at' : 'q.created_at';
  const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

  query += ` ORDER BY ${sortCol} ${sortDir}`;

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);
  return rows.map(formatQRRow);
}

export function getQRById(id: string, userId?: string): QRCodeRecord | null {
  let query = `
    SELECT q.*, COUNT(s.id) as scan_count
    FROM qr_codes q
    LEFT JOIN scans s ON s.qr_code_id = q.id
    WHERE q.id = ?
  `;
  const params: any[] = [id];

  if (userId) {
    if (userId === 'public_free_user') {
      query += ` AND (q.user_id = ? OR q.user_id = 'usr_demo_founder_2026')`;
    } else {
      query += ` AND q.user_id = ?`;
    }
    params.push(userId);
  }

  query += ` GROUP BY q.id`;
  const stmt = db.prepare(query);
  const row = stmt.get(...params);
  if (!row) return null;
  return formatQRRow(row);
}

export function getQRByCode(code: string): QRCodeRecord | null {
  const stmt = db.prepare(`
    SELECT q.*, COUNT(s.id) as scan_count
    FROM qr_codes q
    LEFT JOIN scans s ON s.qr_code_id = q.id
    WHERE q.code = ?
    GROUP BY q.id
  `);
  const row = stmt.get(code);
  if (!row) return null;
  return formatQRRow(row);
}

export function createQRCode(data: {
  user_id: string;
  name: string;
  description?: string;
  destination_url: string;
  qr_style?: QRStyle;
}): QRCodeRecord {
  const id = crypto.randomUUID();
  
  // Generate a collision-free unique random public code
  let code = generateRandomCode(7);
  let attempts = 0;
  while (attempts < 10) {
    const existing = db.prepare('SELECT id FROM qr_codes WHERE code = ?').get(code);
    if (!existing) break;
    code = generateRandomCode(8);
    attempts++;
  }

  const defaultStyle: QRStyle = {
    fgColor: '#0f172a',
    bgColor: '#ffffff',
    size: 512,
    errorCorrection: 'M',
    dotStyle: 'square',
    ...data.qr_style,
  };

  const stmt = db.prepare(`
    INSERT INTO qr_codes (id, user_id, code, name, description, destination_url, status, qr_style, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))
  `);

  stmt.run(
    id,
    data.user_id,
    code,
    data.name.trim(),
    data.description ? data.description.trim() : null,
    data.destination_url.trim(),
    JSON.stringify(defaultStyle)
  );

  return getQRById(id, data.user_id)!;
}

/**
 * CRITICAL REQUIREMENT:
 * Updates destination URL and styling while NEVER changing the unique permanent `code` or created_at!
 */
export function updateQRCode(
  id: string,
  userId: string,
  updates: {
    name?: string;
    description?: string;
    destination_url?: string;
    status?: 'active' | 'paused';
    qr_style?: Partial<QRStyle>;
  }
): QRCodeRecord | null {
  const existing = getQRById(id, userId);
  if (!existing) return null;

  const newName = updates.name !== undefined ? updates.name.trim() : existing.name;
  const newDesc = updates.description !== undefined ? updates.description.trim() : existing.description;
  const newDest = updates.destination_url !== undefined ? updates.destination_url.trim() : existing.destination_url;
  const newStatus = updates.status !== undefined ? updates.status : existing.status;
  const newStyle = updates.qr_style ? { ...existing.qr_style, ...updates.qr_style } : existing.qr_style;

  const isPublic = userId === 'public_free_user';
  const stmt = db.prepare(`
    UPDATE qr_codes
    SET name = ?, description = ?, destination_url = ?, status = ?, qr_style = ?, updated_at = datetime('now')
    WHERE id = ? AND (${isPublic ? "(user_id = ? OR user_id = 'usr_demo_founder_2026')" : 'user_id = ?'})
  `);

  stmt.run(newName, newDesc, newDest, newStatus, JSON.stringify(newStyle), id, userId);

  return getQRById(id, userId);
}

export function toggleQRStatus(id: string, userId: string, status: 'active' | 'paused'): QRCodeRecord | null {
  return updateQRCode(id, userId, { status });
}

export function deleteQRCode(id: string, userId: string): boolean {
  const isPublic = userId === 'public_free_user';
  const stmt = db.prepare(`DELETE FROM qr_codes WHERE id = ? AND (${isPublic ? "(user_id = ? OR user_id = 'usr_demo_founder_2026')" : 'user_id = ?'})`);
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

// Device detection helper
export function parseDeviceCategory(userAgent: string | undefined): {
  device: DeviceCategory;
  browser: string;
  os: string;
} {
  if (!userAgent) {
    return { device: 'unknown', browser: 'Unknown', os: 'Unknown' };
  }

  const ua = userAgent.toLowerCase();

  // Bot detection
  if (ua.includes('bot') || ua.includes('crawl') || ua.includes('spider') || ua.includes('slurp') || ua.includes('mediapartners')) {
    return { device: 'bot', browser: 'Bot Crawler', os: 'Server' };
  }

  // Tablet detection
  let device: DeviceCategory = 'desktop';
  if (ua.includes('ipad') || (ua.includes('tablet') && !ua.includes('mobile')) || (ua.includes('android') && !ua.includes('mobile'))) {
    device = 'tablet';
  } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod') || ua.includes('android')) {
    device = 'mobile';
  }

  // Browser detection
  let browser = 'Other';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/')) browser = 'Chrome';
  else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Safari';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('opera/') || ua.includes('opr/')) browser = 'Opera';

  // OS detection
  let os = 'Other';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('linux')) os = 'Linux';

  return { device, browser, os };
}

// Record scan analytics (Privacy conscious: IP is salted SHA-256 hashed, never stored raw)
export function recordScan(data: {
  qr_code_id: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
}): boolean {
  try {
    const id = crypto.randomUUID();
    const { device, browser, os } = parseDeviceCategory(data.userAgent);
    
    // Privacy-conscious IP hash: Salt with day so cannot be reversed across days
    let ip_hash: string | null = null;
    if (data.ip) {
      const todaySalt = new Date().toISOString().slice(0, 10) + '_flux_salt';
      ip_hash = crypto.createHash('sha256').update(data.ip + todaySalt).digest('hex').substring(0, 20);
    }

    const cleanRef = data.referrer ? data.referrer.slice(0, 255) : null;

    const stmt = db.prepare(`
      INSERT INTO scans (id, qr_code_id, scanned_at, referrer, device_category, browser, os, ip_hash)
      VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.qr_code_id, cleanRef, device, browser, os, ip_hash);
    return true;
  } catch (err) {
    // Critical requirement: Do not let analytics failures prevent a valid redirect
    console.error('Non-blocking analytics recording warning:', err);
    return false;
  }
}

// Analytics Aggregation
export function getQRAnalytics(qr_code_id: string, user_id: string): QRAnalytics | null {
  const qr = getQRById(qr_code_id, user_id);
  if (!qr) return null;

  // 1. Total scans
  const totalStmt = db.prepare('SELECT COUNT(*) as total FROM scans WHERE qr_code_id = ?');
  const total = (totalStmt.get(qr_code_id) as any)?.total || 0;

  // 2. Estimated unique scans (based on unique ip_hash per day)
  const uniqueStmt = db.prepare('SELECT COUNT(DISTINCT ip_hash) as unique_est FROM scans WHERE qr_code_id = ? AND ip_hash IS NOT NULL');
  const uniqueEst = (uniqueStmt.get(qr_code_id) as any)?.unique_est || Math.min(total, Math.ceil(total * 0.75));

  // 3. Scans by day (last 14 days)
  const daysStmt = db.prepare(`
    WITH RECURSIVE dates(date) AS (
      SELECT date('now', '-13 days')
      UNION ALL
      SELECT date(date, '+1 day')
      FROM dates
      WHERE date < date('now')
    )
    SELECT 
      dates.date,
      COUNT(s.id) as count
    FROM dates
    LEFT JOIN scans s ON date(s.scanned_at) = dates.date AND s.qr_code_id = ?
    GROUP BY dates.date
    ORDER BY dates.date ASC
  `);
  const scans_by_day = daysStmt.all(qr_code_id) as Array<{ date: string; count: number }>;

  // 4. Devices breakdown
  const devStmt = db.prepare(`
    SELECT device_category as name, COUNT(*) as count
    FROM scans
    WHERE qr_code_id = ?
    GROUP BY device_category
    ORDER BY count DESC
  `);
  const devRows = devStmt.all(qr_code_id) as Array<{ name: string; count: number }>;
  const devices = devRows.map(r => ({
    name: r.name ? r.name.charAt(0).toUpperCase() + r.name.slice(1) : 'Unknown',
    count: r.count,
    percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
  }));

  // 5. Referrers breakdown
  const refStmt = db.prepare(`
    SELECT 
      CASE 
        WHEN referrer IS NULL OR referrer = '' THEN 'Direct / QR Camera'
        WHEN referrer LIKE '%google%' THEN 'Google'
        WHEN referrer LIKE '%twitter%' OR referrer LIKE '%t.co%' OR referrer LIKE '%x.com%' THEN 'X / Twitter'
        WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
        WHEN referrer LIKE '%facebook%' OR referrer LIKE '%fb%' THEN 'Facebook'
        WHEN referrer LIKE '%instagram%' THEN 'Instagram'
        ELSE 'Other Website'
      END as name,
      COUNT(*) as count
    FROM scans
    WHERE qr_code_id = ?
    GROUP BY name
    ORDER BY count DESC
    LIMIT 5
  `);
  const refRows = refStmt.all(qr_code_id) as Array<{ name: string; count: number }>;
  const referrers = refRows.map(r => ({
    name: r.name,
    count: r.count,
    percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
  }));

  // 6. Recent scans
  const recentStmt = db.prepare(`
    SELECT id, qr_code_id, scanned_at, referrer, device_category, browser, os
    FROM scans
    WHERE qr_code_id = ?
    ORDER BY scanned_at DESC
    LIMIT 20
  `);
  const recent_scans = recentStmt.all(qr_code_id) as ScanRecord[];

  return {
    qr_id: qr_code_id,
    total_scans: total,
    unique_scans_estimate: uniqueEst,
    scans_by_day,
    devices,
    referrers,
    recent_scans,
  };
}

// User Dashboard Overall Stats
export function getDashboardStats(userId: string): DashboardStats {
  const isPublic = userId === 'public_free_user';
  const qrStmt = db.prepare(`
    SELECT 
      COUNT(*) as total_qrs,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_qrs,
      SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused_qrs
    FROM qr_codes
    WHERE ${isPublic ? "(user_id = ? OR user_id = 'usr_demo_founder_2026')" : 'user_id = ?'}
  `);
  const qrStats = (qrStmt.get(userId) as any) || { total_qrs: 0, active_qrs: 0, paused_qrs: 0 };

  const scanStmt = db.prepare(`
    SELECT 
      COUNT(s.id) as total_scans,
      SUM(CASE WHEN s.scanned_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as scans_last_7_days
    FROM scans s
    JOIN qr_codes q ON q.id = s.qr_code_id
    WHERE ${isPublic ? "(q.user_id = ? OR q.user_id = 'usr_demo_founder_2026')" : 'q.user_id = ?'}
  `);
  const scanStats = (scanStmt.get(userId) as any) || { total_scans: 0, scans_last_7_days: 0 };

  return {
    total_qrs: qrStats.total_qrs || 0,
    active_qrs: qrStats.active_qrs || 0,
    paused_qrs: qrStats.paused_qrs || 0,
    total_scans: scanStats.total_scans || 0,
    scans_last_7_days: scanStats.scans_last_7_days || 0,
  };
}

export default db;
