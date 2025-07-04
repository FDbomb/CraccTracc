'use client';

import { useState, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { SailingAnalysis } from '../../lib/types/sailing';

interface FileUploadProps {
  onDataProcessed: (analysis: SailingAnalysis) => void;
  onError: (error: string) => void;
}

export function FileUpload({ onDataProcessed, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('idle');

    try {
      // Validate file type
      const allowedTypes = ['.gpx', '.vkx'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        throw new Error(`Unsupported file type. Please use: ${allowedTypes.join(', ')}`);
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        throw new Error('File size too large. Maximum size is 50MB.');
      }

      // Send to API for processing
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const analysis: SailingAnalysis = await response.json();
      setUploadStatus('success');
      onDataProcessed(analysis);

    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onDataProcessed, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isProcessing ? 'Processing file...' : 'Upload your sailing track'}
            </p>
            <p className="text-sm text-gray-500">
              Drag and drop your GPX or VKX file here, or click to browse
            </p>
          </div>

          {!isProcessing && (
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".gpx,.vkx"
                onChange={handleFileSelect}
              />
              <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Choose File
              </span>
            </label>
          )}

          {uploadStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">File processed successfully!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">Upload failed. Please try again.</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Supported formats:</strong> .gpx, .vkx</p>
        <p><strong>Max file size:</strong> 50MB</p>
      </div>
    </div>
  );
}