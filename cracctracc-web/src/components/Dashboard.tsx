'use client';

import { useState } from 'react';
import { FileUpload } from './upload/FileUpload';
import { PolarChart } from './charts/PolarChart';
import { CourseChart } from './charts/CourseChart';
import { WindChart } from './charts/WindChart';
import { ManoeuvreTable } from './tables/ManoeuvreTable';
import { SummaryStats } from './stats/SummaryStats';
import { DataExporter } from './export/DataExporter';
import { PerformanceAnalytics } from './analytics/PerformanceAnalytics';
import { UserSettings } from './settings/UserSettings';
import { SailingAnalysis } from '../lib/types/sailing';
import { AlertTriangle, Settings, BarChart3, Download } from 'lucide-react';

interface UserSettingsType {
  units: {
    speed: string;
    distance: string;
    wind: string;
  };
  filters: {
    minSpeed: number;
    maxSpeed: number;
    smoothingWindow: number;
    outlierThreshold: number;
  };
  display: {
    theme: string;
    chartColors: string;
    showAdvancedMetrics: boolean;
    autoRefresh: boolean;
  };
  analysis: {
    manoeuvreDetectionSensitivity: number;
    windShiftThreshold: number;
    tackingAngleThreshold: number;
    vmgCalculationMethod: string;
  };
}

export function Dashboard() {
  const [analysisData, setAnalysisData] = useState<SailingAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'export'>('overview');
  const [showSettings, setShowSettings] = useState(false);

  const handleDataProcessed = (analysis: SailingAnalysis) => {
    setAnalysisData(analysis);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleSettingsChange = (settings: UserSettingsType) => {
    console.log('Settings updated:', settings);
    // TODO: Apply settings to data processing and display
  };

  const exportData = () => {
    if (!analysisData) return;
    
    const dataStr = JSON.stringify(analysisData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sailing-analysis-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CraccTracc</h1>
              <p className="text-gray-600">Advanced Sailing VMG Analysis Tool</p>
            </div>
            
            {/* Navigation Tabs */}
            {analysisData && (
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveView('overview')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'overview'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveView('analytics')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'analytics'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 inline mr-1" />
                  Analytics
                </button>
                <button
                  onClick={() => setActiveView('export')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'export'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  Export
                </button>
              </div>
            )}

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Settings className="w-5 h-5 mr-1" />
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!analysisData && (
          <div className="text-center py-12">
            <FileUpload 
              onDataProcessed={handleDataProcessed}
              onError={handleError}
            />
          </div>
        )}

        {/* Analysis Results */}
        {analysisData && (
          <div className="space-y-8">
            {/* Overview Tab */}
            {activeView === 'overview' && (
              <>
                {/* Summary Statistics */}
                <SummaryStats analysis={analysisData} />

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CourseChart data={analysisData.trackPoints} />
                  <PolarChart data={analysisData.trackPoints} />
                  <WindChart data={analysisData.trackPoints} />
                  <ManoeuvreTable manoeuvres={analysisData.manoeuvres} />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setAnalysisData(null)}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Upload New File
                  </button>
                  <button
                    onClick={exportData}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    Quick Export JSON
                  </button>
                </div>
              </>
            )}

            {/* Advanced Analytics Tab */}
            {activeView === 'analytics' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Analytics</h2>
                  <p className="text-gray-600">Detailed analysis of sailing performance and tactics</p>
                </div>
                
                <PerformanceAnalytics 
                  trackPoints={analysisData.trackPoints}
                  manoeuvres={analysisData.manoeuvres}
                />
              </div>
            )}

            {/* Export Tab */}
            {activeView === 'export' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Export</h2>
                  <p className="text-gray-600">Export your sailing data in various formats with filtering options</p>
                </div>
                
                <div className="max-w-4xl mx-auto">
                  <DataExporter analysis={analysisData} />
                </div>

                {/* Additional Export Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                    <h3 className="font-medium mb-2">Quick Export</h3>
                    <p className="text-sm text-gray-600 mb-3">Export complete analysis as JSON</p>
                    <button
                      onClick={exportData}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Download JSON
                    </button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                    <h3 className="font-medium mb-2">Share Link</h3>
                    <p className="text-sm text-gray-600 mb-3">Generate shareable analysis link</p>
                    <button
                      disabled
                      className="w-full px-3 py-2 bg-gray-100 text-gray-400 rounded cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
                    <h3 className="font-medium mb-2">API Export</h3>
                    <p className="text-sm text-gray-600 mb-3">Send to external sailing app</p>
                    <button
                      disabled
                      className="w-full px-3 py-2 bg-gray-100 text-gray-400 rounded cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* User Settings Modal */}
      <UserSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}