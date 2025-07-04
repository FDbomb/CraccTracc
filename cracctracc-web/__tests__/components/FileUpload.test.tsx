import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileUpload } from '@/components/upload/FileUpload';

// Mock the fetch function
global.fetch = jest.fn();

describe('FileUpload Component', () => {
  const mockOnDataProcessed = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        trackPoints: [], 
        manoeuvres: [], 
        summary: {
          totalDistance: 0,
          totalTime: 0,
          averageSpeed: 0,
          maxSpeed: 0,
          tackCount: 0,
          gybeCount: 0,
          averageTwa: 0
        }
      })
    });
  });

  test('renders upload interface', () => {
    render(
      <FileUpload 
        onDataProcessed={mockOnDataProcessed}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Upload your sailing track')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: .gpx, .vkx')).toBeInTheDocument();
  });

  test('handles file selection', async () => {
    render(
      <FileUpload 
        onDataProcessed={mockOnDataProcessed}
        onError={mockOnError}
      />
    );

    const fileInput = screen.getByRole('button', { name: /choose file/i })
      .querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['gpx content'], 'test.gpx', { type: 'application/gpx+xml' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        body: expect.any(FormData)
      });
    });
  });

  test('validates file type', async () => {
    render(
      <FileUpload 
        onDataProcessed={mockOnDataProcessed}
        onError={mockOnError}
      />
    );

    const fileInput = screen.getByRole('button', { name: /choose file/i })
      .querySelector('input[type="file"]') as HTMLInputElement;

    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported file type')
      );
    });
  });

  test('validates file size', async () => {
    render(
      <FileUpload 
        onDataProcessed={mockOnDataProcessed}
        onError={mockOnError}
      />
    );

    const fileInput = screen.getByRole('button', { name: /choose file/i })
      .querySelector('input[type="file"]') as HTMLInputElement;

    // Create a large file (over 50MB)
    const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.gpx', { 
      type: 'application/gpx+xml' 
    });
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        'File size too large. Maximum size is 50MB.'
      );
    });
  });

  test('handles drag and drop', () => {
    render(
      <FileUpload 
        onDataProcessed={mockOnDataProcessed}
        onError={mockOnError}
      />
    );

    const dropZone = screen.getByText('Upload your sailing track').closest('div');
    
    fireEvent.dragOver(dropZone!);
    expect(dropZone).toHaveClass('border-blue-400');

    fireEvent.dragLeave(dropZone!);
    expect(dropZone).not.toHaveClass('border-blue-400');
  });

  test('shows loading state during processing', async () => {
    // Mock a delayed response
    (fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ trackPoints: [], manoeuvres: [], summary: {} })
      }), 100))
    );

    render(
      <FileUpload 
        onDataProcessed={mockOnDataProcessed}
        onError={mockOnError}
      />
    );

    const fileInput = screen.getByRole('button', { name: /choose file/i })
      .querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['gpx content'], 'test.gpx', { type: 'application/gpx+xml' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('Processing file...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockOnDataProcessed).toHaveBeenCalled();
    });
  });

  test('handles API errors', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Server Error',
      json: () => Promise.resolve({ error: 'Processing failed' })
    });

    render(
      <FileUpload 
        onDataProcessed={mockOnDataProcessed}
        onError={mockOnError}
      />
    );

    const fileInput = screen.getByRole('button', { name: /choose file/i })
      .querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['gpx content'], 'test.gpx', { type: 'application/gpx+xml' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Processing failed');
    });
  });
});