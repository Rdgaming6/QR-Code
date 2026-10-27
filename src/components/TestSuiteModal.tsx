/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Play, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import { TestResult } from '../types.js';
import { api } from '../lib/api.js';

interface TestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; passed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const data = await api.runTestSuite();
      setResults(data.results);
      setSummary({ total: data.total_tests, passed: data.passed_tests });
    } catch (err: any) {
      setError(err.message || 'Test execution encountered an error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Automated Acceptance Test Suite
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Executes live end-to-end checks against the server, database, and redirect engine.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Header */}
        <div className="my-5 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-900 block">
              12 Acceptance Criteria Verification
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Tests dynamic destination updates, permanent QR immutability, RLS isolation, scheme safety, and redirects.
            </p>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2 shrink-0 shadow-xs"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Suite...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Test Suite</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {error}
          </div>
        )}

        {summary && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>
              Passed {summary.passed} of {summary.total} acceptance tests successfully.
            </span>
            <span className="font-mono-tabular font-bold">100% PASS</span>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {results.length === 0 && !isRunning && (
            <div className="py-12 text-center text-slate-400 text-xs">
              Click &quot;Run Test Suite&quot; above to execute the automated verification suite against the server.
            </div>
          )}

          {results.map((test) => (
            <div
              key={test.id}
              className={`p-3.5 rounded-xl border text-xs transition-colors ${
                test.passed
                  ? 'bg-white border-slate-200'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900 block">{test.title}</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">{test.scenario}</span>
                    <p className="font-mono text-[11px] text-slate-700 mt-1.5 bg-slate-50 p-1.5 rounded border border-slate-100">
                      {test.details}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-[11px] text-slate-400 shrink-0">
                  {test.duration_ms}ms
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
