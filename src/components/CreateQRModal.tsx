/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, QrCode, AlertCircle, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
import { QRStyle, ErrorCorrectionLevel } from '../types.js';
import { renderQRToDataURL, getContrastRatio } from '../lib/qr-generator.js';

interface CreateQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    destination_url: string;
    description?: string;
    qr_style: QRStyle;
  }) => Promise<void>;
}

export const CreateQRModal: React.FC<CreateQRModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [description, setDescription] = useState('');
  const [fgColor, setFgColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrectionLevel>('M');
  const [logoOption, setLogoOption] = useState<'none' | 'icon' | 'custom'>('none');
  const [customLogoData, setCustomLogoData] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Temporary random code for live preview
  const previewCode = 'preview';

  const contrast = getContrastRatio(fgColor, bgColor);
  const isContrastLow = contrast < 3.5;

  // Update live preview
  useEffect(() => {
    const style: QRStyle = {
      fgColor,
      bgColor,
      size: 512,
      errorCorrection: logoOption !== 'none' ? 'H' : errorCorrection,
      logoData: logoOption === 'custom' ? customLogoData : undefined,
      logoSize: 22,
    };

    renderQRToDataURL(previewCode, style, 320).then(setPreviewImage);
  }, [fgColor, bgColor, errorCorrection, logoOption, customLogoData]);

  if (!isOpen) return null;

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) {
        setError('Logo file should be under 500KB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCustomLogoData(reader.result as string);
        setLogoOption('custom');
        setErrorCorrection('H'); // Auto-bump to H for center logo
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a name for this QR code');
      return;
    }

    if (!destinationUrl.trim()) {
      setError('Please enter a destination URL');
      return;
    }

    let target = destinationUrl.trim();
    if (/^(javascript|data|vbscript|file):/i.test(target)) {
      setError('Unsafe URL protocol. Please enter a valid web URL.');
      return;
    }
    if (!/^https?:\/\//i.test(target)) {
      target = `https://${target}`;
    }

    try {
      const parsed = new URL(target);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('URL must begin with http:// or https://');
        return;
      }
    } catch {
      setError('Please enter a valid web URL (e.g. https://example.com)');
      return;
    }

    setIsSubmitting(true);
    try {
      const style: QRStyle = {
        fgColor,
        bgColor,
        size: 512,
        errorCorrection: logoOption !== 'none' ? 'H' : errorCorrection,
        logoData: logoOption === 'custom' ? customLogoData : undefined,
        logoSize: 22,
      };

      await onSubmit({
        name: name.trim(),
        destination_url: target,
        description: description.trim() || undefined,
        qr_style: style,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create QR code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full p-6 sm:p-8 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Create Dynamic QR Code</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generates a permanent redirect URL. Destination can be edited anytime.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Form Fields */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  QR Code Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Autumn Restaurant Table Tent"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination URL *
                </label>
                <input
                  type="url"
                  required
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com/menu"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This destination can be updated at any time in the future without changing the QR image.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Printed on 50 physical acrylic stands"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              {/* Style Customization */}
              <div className="pt-2 border-t border-slate-100 space-y-4">
                <span className="text-xs font-semibold text-slate-900 block">
                  Branding & Colors
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">QR Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={fgColor}
                        onChange={(e) => setFgColor(e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded"
                      />
                    </div>
                  </div>
                </div>

                {isContrastLow && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Low contrast ({contrast}:1). Darker QR colors scan more reliably.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Error Correction
                    </label>
                    <select
                      value={errorCorrection}
                      onChange={(e) => setErrorCorrection(e.target.value as ErrorCorrectionLevel)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="L">L (7% recovery)</option>
                      <option value="M">M (15% standard)</option>
                      <option value="Q">Q (25% high)</option>
                      <option value="H">H (30% best for logo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Center Logo
                    </label>
                    <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 text-slate-700">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{customLogoData ? 'Change Logo' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleCustomLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Preview */}
            <div className="md:col-span-5 flex flex-col items-center justify-center bg-slate-50 p-6 rounded-xl border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
                Live QR Preview
              </span>

              <div className="w-48 h-48 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
                )}
              </div>

              <div className="mt-4 text-center">
                <span className="text-[11px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  Encodes: /r/[permanent_id]
                </span>
                <p className="text-[11px] text-slate-500 mt-2 max-w-[200px] leading-relaxed">
                  Never encodes destination URL directly. Protects QR longevity.
                </p>
              </div>
            </div>

          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Dynamic QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
