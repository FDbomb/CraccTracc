'use client';

import { useState, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle, FileIcon } from 'lucide-react';
import { SailingAnalysis } from '../../lib/types/sailing';

interface FileUploadProps {
  onDataProcessed: (analysis: SailingAnalysis) => void;
  onError: (error: string) => void;
}

interface FileValidation {
  isValid: boolean;
  error?: string;
}

export function FileUpload({ onDataProcessed, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState<string>('');

  const SUPPORTED_FORMATS = ['.gpx', '.vkx'];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): FileValidation => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!SUPPORTED_FORMATS.includes(extension)) {
      return {
        isValid: false,
        error: `Unsupported file type. Please use: ${SUPPORTED_FORMATS.join(', ')}`
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'File size too large. Maximum size is 50MB.'
      };
    }

    return { isValid: true };
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('idle');
    setFileName(file.name);

    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Send to API for processing
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
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
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400 hover:bg-gray-50'}
          ${uploadStatus === 'error' ? 'border-red-300 bg-red-50' : ''}
          ${uploadStatus === 'success' ? 'border-green-300 bg-green-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <div>
                <p className="text-lg font-medium text-gray-900">Processing file...</p>
                <p className="text-sm text-gray-500">{fileName}</p>
              </div>
            </>
          ) : uploadStatus === 'success' ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-600" />
              <div>
                <p className="text-lg font-medium text-green-900">File processed successfully!</p>
                <p className="text-sm text-green-600">{fileName}</p>
              </div>
            </>
          ) : uploadStatus === 'error' ? (
            <>
              <AlertCircle className="h-12 w-12 text-red-600" />
              <div>
                <p className="text-lg font-medium text-red-900">Upload failed</p>
                <p className="text-sm text-red-600">Please try again</p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Upload your sailing track
                </p>
                <p className="text-sm text-gray-500">
                  Drag and drop your GPX or VKX file here, or click to browse
                </p>
              </div>
            </>
          )}

          {!isProcessing && uploadStatus !== 'success' && (
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".gpx,.vkx"
                onChange={handleFileSelect}
              />
              <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <FileIcon className="w-4 h-4 mr-2" />
                Choose File
              </span>
            </label>
          )}

          {uploadStatus === 'success' && (
            <button
              onClick={() => {
                setUploadStatus('idle');
                setFileName('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Upload Another File
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Supported formats:</strong> {SUPPORTED_FORMATS.join(', ')}</p>
        <p><strong>Max file size:</strong> 50MB</p>
      </div>
    </div>
  );
}