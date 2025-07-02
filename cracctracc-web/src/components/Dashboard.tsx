'use client';

import { useState } from 'react';
import { FileUpload } from './upload/FileUpload';
import { PolarChart } from './charts/PolarChart';
import { CourseChart } from './charts/CourseChart';
import { WindChart } from './charts/WindChart';
import { ManoeuvreTable } from './tables/ManoeuvreTable';
import { SummaryStats } from './stats/SummaryStats';
import { SailingAnalysis } from '../lib/types/sailing';
import { AlertTriangle, Download, Upload as UploadIcon } from 'lucide-react';

export function Dashboard() {
  const [analysisData, setAnalysisData] = useState<SailingAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDataProcessed = (analysis: SailingAnalysis) => {
    setAnalysisData(analysis);
    setError(null);
    setIsLoading(false);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  };



  const handleExport = async () => {
    if (!analysisData) return;

    try {
      const dataStr = JSON.stringify(analysisData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `sailing-analysis-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export data');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CraccTracc</h1>
              <p className="text-gray-600">Sailing Performance Analysis Tool</p>
            </div>
            {analysisData && (
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setAnalysisData(null);
                    setError(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Upload New File
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              <p className="text-blue-800">Processing your sailing data...</p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!analysisData && !isLoading && (
          <div className="text-center py-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to CraccTracc
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload your GPX or VKX sailing track files to analyze your performance, 
                track manoeuvres, and visualize your sailing data with interactive charts.
              </p>
            </div>
            
            <FileUpload 
              onDataProcessed={handleDataProcessed}
              onError={handleError}
            />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="bg-blue-50 rounded-lg p-6 mb-4">
                  <div className="text-blue-600 text-3xl mb-2">📊</div>
                  <h3 className="font-semibold text-gray-900">Performance Analysis</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Track your speed, distance, and sailing efficiency with detailed metrics
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-50 rounded-lg p-6 mb-4">
                  <div className="text-green-600 text-3xl mb-2">🌊</div>
                  <h3 className="font-semibold text-gray-900">Wind Analysis</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Understand wind patterns and optimize your sailing angles
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-50 rounded-lg p-6 mb-4">
                  <div className="text-purple-600 text-3xl mb-2">⚓</div>
                  <h3 className="font-semibold text-gray-900">Manoeuvre Detection</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Automatically detect tacks, gybes, and other sailing manoeuvres
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisData && !isLoading && (
          <div className="space-y-8">
            {/* Summary Statistics */}
            <SummaryStats analysis={analysisData} />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CourseChart data={analysisData.trackPoints} />
              <WindChart data={analysisData.trackPoints} />
            </div>

            {/* Additional Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PolarChart data={analysisData.trackPoints} />
              <ManoeuvreTable manoeuvres={analysisData.manoeuvres} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>
              CraccTracc - Sailing Performance Analysis Tool | 
              Built with Next.js and TypeScript
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}