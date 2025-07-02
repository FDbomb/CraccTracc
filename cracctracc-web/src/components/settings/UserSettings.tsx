'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface AnalysisSettings {
  units: {
    speed: 'knots' | 'mph' | 'kmh';
    distance: 'nautical_miles' | 'miles' | 'kilometers';
    wind: 'degrees' | 'cardinal';
  };
  filters: {
    minSpeed: number;
    maxSpeed: number;
    smoothingWindow: number;
    outlierThreshold: number;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    chartColors: 'default' | 'colorblind' | 'high_contrast';
    showAdvancedMetrics: boolean;
    autoRefresh: boolean;
  };
  analysis: {
    manoeuvreDetectionSensitivity: number;
    windShiftThreshold: number;
    tackingAngleThreshold: number;
    vmgCalculationMethod: 'true_wind' | 'apparent_wind';
  };
}

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: AnalysisSettings) => void;
}

const defaultSettings: AnalysisSettings = {
  units: {
    speed: 'knots',
    distance: 'nautical_miles',
    wind: 'degrees'
  },
  filters: {
    minSpeed: 0,
    maxSpeed: 50,
    smoothingWindow: 5,
    outlierThreshold: 3
  },
  display: {
    theme: 'light',
    chartColors: 'default',
    showAdvancedMetrics: true,
    autoRefresh: false
  },
  analysis: {
    manoeuvreDetectionSensitivity: 0.7,
    windShiftThreshold: 15,
    tackingAngleThreshold: 20,
    vmgCalculationMethod: 'true_wind'
  }
};

export function UserSettings({ isOpen, onClose, onSettingsChange }: UserSettingsProps) {
  const [settings, setSettings] = useState<AnalysisSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'units' | 'filters' | 'display' | 'analysis'>('units');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage on component mount
    const savedSettings = localStorage.getItem('cracctracc-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const handleSettingChange = (category: keyof AnalysisSettings, key: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('cracctracc-settings', JSON.stringify(settings));
    onSettingsChange(settings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    onClose();
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'units', label: 'Units', icon: Settings },
    { id: 'filters', label: 'Filters', icon: EyeOff },
    { id: 'display', label: 'Display', icon: Eye },
    { id: 'analysis', label: 'Analysis', icon: Settings }
  ] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Analysis Settings</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-48 bg-gray-50 border-r">
            <nav className="p-4 space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-left rounded transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {activeTab === 'units' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Unit Preferences</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Speed Units</label>
                    <select
                      value={settings.units.speed}
                      onChange={(e) => handleSettingChange('units', 'speed', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="knots">Knots</option>
                      <option value="mph">Miles per Hour</option>
                      <option value="kmh">Kilometers per Hour</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Distance Units</label>
                    <select
                      value={settings.units.distance}
                      onChange={(e) => handleSettingChange('units', 'distance', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="nautical_miles">Nautical Miles</option>
                      <option value="miles">Miles</option>
                      <option value="kilometers">Kilometers</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wind Direction</label>
                    <select
                      value={settings.units.wind}
                      onChange={(e) => handleSettingChange('units', 'wind', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="degrees">Degrees (0-360°)</option>
                      <option value="cardinal">Cardinal (N, NE, E...)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'filters' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Data Filtering</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Speed ({settings.units.speed})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={settings.filters.minSpeed}
                      onChange={(e) => handleSettingChange('filters', 'minSpeed', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Filter out data points below this speed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Speed ({settings.units.speed})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={settings.filters.maxSpeed}
                      onChange={(e) => handleSettingChange('filters', 'maxSpeed', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Filter out data points above this speed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Smoothing Window (points)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={settings.filters.smoothingWindow}
                      onChange={(e) => handleSettingChange('filters', 'smoothingWindow', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of points to average for smoothing</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Outlier Threshold (σ)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={settings.filters.outlierThreshold}
                      onChange={(e) => handleSettingChange('filters', 'outlierThreshold', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Standard deviations for outlier detection</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'display' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Display Preferences</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                    <select
                      value={settings.display.theme}
                      onChange={(e) => handleSettingChange('display', 'theme', e.target.value)}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chart Colors</label>
                    <select
                      value={settings.display.chartColors}
                      onChange={(e) => handleSettingChange('display', 'chartColors', e.target.value)}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="default">Default</option>
                      <option value="colorblind">Colorblind Friendly</option>
                      <option value="high_contrast">High Contrast</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.display.showAdvancedMetrics}
                        onChange={(e) => handleSettingChange('display', 'showAdvancedMetrics', e.target.checked)}
                        className="mr-2"
                      />
                      Show Advanced Metrics
                    </label>
                    <p className="text-xs text-gray-500 ml-6">Display detailed VMG, polar performance, and statistical data</p>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.display.autoRefresh}
                        onChange={(e) => handleSettingChange('display', 'autoRefresh', e.target.checked)}
                        className="mr-2"
                      />
                      Auto-refresh Charts
                    </label>
                    <p className="text-xs text-gray-500 ml-6">Automatically update charts when data changes</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Analysis Configuration</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manoeuvre Detection Sensitivity
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={settings.analysis.manoeuvreDetectionSensitivity}
                      onChange={(e) => handleSettingChange('analysis', 'manoeuvreDetectionSensitivity', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low (0.1)</span>
                      <span>Current: {settings.analysis.manoeuvreDetectionSensitivity}</span>
                      <span>High (1.0)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Higher values detect more subtle manoeuvres</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Wind Shift Threshold (°)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="45"
                        value={settings.analysis.windShiftThreshold}
                        onChange={(e) => handleSettingChange('analysis', 'windShiftThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum wind direction change to detect shifts</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tacking Angle Threshold (°)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="60"
                        value={settings.analysis.tackingAngleThreshold}
                        onChange={(e) => handleSettingChange('analysis', 'tackingAngleThreshold', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum heading change to detect tacks</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">VMG Calculation Method</label>
                    <select
                      value={settings.analysis.vmgCalculationMethod}
                      onChange={(e) => handleSettingChange('analysis', 'vmgCalculationMethod', e.target.value)}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="true_wind">True Wind</option>
                      <option value="apparent_wind">Apparent Wind</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Method for calculating Velocity Made Good</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}