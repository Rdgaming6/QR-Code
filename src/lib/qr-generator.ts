/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { QRStyle, ErrorCorrectionLevel } from '../types.js';

export function getPermanentRedirectUrl(code: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/r/${code}`;
  }
  return `/r/${code}`;
}

export interface RenderQROptions {
  code: string;
  style?: Partial<QRStyle>;
  customSize?: number;
}

/**
 * Calculates luminance for contrast calculation
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Returns contrast ratio between fg and bg colors
 */
export function getContrastRatio(fgHex: string, bgHex: string): number {
  try {
    const l1 = getLuminance(fgHex);
    const l2 = getLuminance(bgHex);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
  } catch {
    return 21; // default to safe
  }
}

/**
 * Generates high quality QR code data URL onto an HTMLCanvasElement
 */
export async function renderQRToDataURL(
  code: string,
  style?: Partial<QRStyle>,
  targetSize = 512
): Promise<string> {
  const permUrl = getPermanentRedirectUrl(code);
  const fg = style?.fgColor || '#0f172a';
  const bg = style?.bgColor || '#ffffff';
  // If logo is present, require at least 'Q' or 'H' error correction to ensure scannability!
  const hasLogo = Boolean(style?.logoData);
  const ecLevel: ErrorCorrectionLevel = hasLogo ? 'H' : (style?.errorCorrection || 'M');

  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  await QRCode.toCanvas(canvas, permUrl, {
    width: targetSize,
    margin: 3,
    color: {
      dark: fg,
      light: bg,
    },
    errorCorrectionLevel: ecLevel,
  });

  // If there is a center logo, draw it with a clean padded background circular badge
  if (hasLogo && style?.logoData) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const logoPercent = (style.logoSize || 20) / 100;
          const logoPixelSize = targetSize * logoPercent;
          const x = (targetSize - logoPixelSize) / 2;
          const y = (targetSize - logoPixelSize) / 2;

          // Draw white background pill/circle to isolate logo from QR matrix
          const padding = logoPixelSize * 0.15;
          ctx.save();
          ctx.beginPath();
          ctx.arc(targetSize / 2, targetSize / 2, (logoPixelSize / 2) + padding, 0, Math.PI * 2);
          ctx.fillStyle = bg;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = fg;
          ctx.stroke();

          // Clip to circle and draw logo
          ctx.beginPath();
          ctx.arc(targetSize / 2, targetSize / 2, logoPixelSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, x, y, logoPixelSize, logoPixelSize);
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = style.logoData!;
      });
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generates clean SVG markup encoding the permanent URL
 */
export async function renderQRToSVG(
  code: string,
  style?: Partial<QRStyle>,
  targetSize = 512
): Promise<string> {
  const permUrl = getPermanentRedirectUrl(code);
  const fg = style?.fgColor || '#0f172a';
  const bg = style?.bgColor || '#ffffff';
  const ecLevel: ErrorCorrectionLevel = style?.logoData ? 'H' : (style?.errorCorrection || 'M');

  return QRCode.toString(permUrl, {
    type: 'svg',
    width: targetSize,
    margin: 3,
    color: {
      dark: fg,
      light: bg,
    },
    errorCorrectionLevel: ecLevel,
  });
}

/**
 * Trigger file download for PNG or SVG
 */
export function downloadFile(content: string, filename: string, isDataUrl = false) {
  const a = document.createElement('a');
  if (isDataUrl) {
    a.href = content;
  } else {
    const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
    a.href = URL.createObjectURL(blob);
  }
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
