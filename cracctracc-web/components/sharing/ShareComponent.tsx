'use client';

import { useState } from 'react';
import { SailingAnalysis } from '../../lib/types/sailing';
import { Share2, Copy, Check, Clock, Lock, Eye } from 'lucide-react';

interface ShareComponentProps {
  analysisData: SailingAnalysis;
}

interface ShareOptions {
  expiresIn?: number;
  password?: string;
  publicSummaryOnly: boolean;
}

interface ShareResult {
  shareId: string;
  shareUrl: string;
  expiresAt?: number;
  hasPassword: boolean;
  publicSummaryOnly: boolean;
}

export function ShareComponent({ analysisData }: ShareComponentProps) {
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    expiresIn: 24,
    password: '',
    publicSummaryOnly: true
  });
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createShareLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analytics/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: analysisData,
          options: shareOptions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const result = await response.json();
      setShareResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const deleteShare = async () => {
    if (!shareResult) return;

    try {
      await fetch(`/api/analytics/share?id=${shareResult.shareId}`, {
        method: 'DELETE'
      });
      setShareResult(null);
    } catch (err) {
      console.error('Failed to delete share:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Share Options */}
      {!shareResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expiration Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Link Expires In
              </label>
              <select
                value={shareOptions.expiresIn}
                onChange={(e) => setShareOptions({
                  ...shareOptions,
                  expiresIn: e.target.value ? Number(e.target.value) : undefined
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Never</option>
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">1 week</option>
                <option value="720">1 month</option>
              </select>
            </div>

            {/* Privacy Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Eye className="w-4 h-4 inline mr-1" />
                Privacy Level
              </label>
              <select
                value={shareOptions.publicSummaryOnly ? 'summary' : 'full'}
                onChange={(e) => setShareOptions({
                  ...shareOptions,
                  publicSummaryOnly: e.target.value === 'summary'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="summary">Summary only (recommended)</option>
                <option value="full">Full track data</option>
              </select>
            </div>
          </div>

          {/* Password Protection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="w-4 h-4 inline mr-1" />
              Password Protection (optional)
            </label>
            <input
              type="password"
              value={shareOptions.password}
              onChange={(e) => setShareOptions({
                ...shareOptions,
                password: e.target.value
              })}
              placeholder="Enter password to protect link"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Privacy Notice</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• {shareOptions.publicSummaryOnly ? 'Only summary statistics and manoeuvres will be shared' : 'Complete track data including exact positions will be shared'}</li>
              <li>• Links can be accessed by anyone who has the URL</li>
              <li>• {shareOptions.password ? 'Password protection adds an extra security layer' : 'Consider adding password protection for sensitive data'}</li>
              <li>• You can delete the share link at any time</li>
            </ul>
          </div>

          {/* Create Share Button */}
          <button
            onClick={createShareLink}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Share2 className="w-5 h-5 mr-2" />
            {loading ? 'Creating Link...' : 'Create Share Link'}
          </button>
        </div>
      )}

      {/* Share Result */}
      {shareResult && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              <h4 className="font-medium text-green-900">Share Link Created!</h4>
            </div>
            
            <div className="space-y-3">
              {/* Share URL */}
              <div>
                <label className="block text-sm font-medium text-green-800 mb-1">Share URL:</label>
                <div className="flex">
                  <input
                    type="text"
                    value={shareResult.shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-green-300 rounded-l-md text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(shareResult.shareUrl)}
                    className="px-3 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Share Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-green-800">Share ID:</span>
                  <span className="ml-2 font-mono text-green-700">{shareResult.shareId}</span>
                </div>
                <div>
                  <span className="font-medium text-green-800">Privacy:</span>
                  <span className="ml-2 text-green-700">
                    {shareResult.publicSummaryOnly ? 'Summary only' : 'Full data'}
                  </span>
                </div>
                {shareResult.expiresAt && (
                  <div>
                    <span className="font-medium text-green-800">Expires:</span>
                    <span className="ml-2 text-green-700">
                      {new Date(shareResult.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-green-800">Protected:</span>
                  <span className="ml-2 text-green-700">
                    {shareResult.hasPassword ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => setShareResult(null)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Create New Link
            </button>
            <button
              onClick={deleteShare}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Link
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}