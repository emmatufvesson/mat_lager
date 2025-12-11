import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Scanner from '../../components/Scanner';
import { analyzeImage, lookupBarcode } from '../../services/geminiService';
import type { InventoryItem } from '../../types';

// Mock the services
jest.mock('../../services/geminiService', () => ({
  analyzeImage: jest.fn(),
  lookupBarcode: jest.fn(),
}));

const mockAnalyzeImage = analyzeImage as jest.MockedFunction<typeof analyzeImage>;
const mockLookupBarcode = lookupBarcode as jest.MockedFunction<typeof lookupBarcode>;

// Mock Html5QrcodeScanner
const mockScanner = {
  render: jest.fn(),
  clear: jest.fn().mockResolvedValue(undefined),
};

global.Html5QrcodeScanner = jest.fn().mockImplementation(() => mockScanner);

// Mock the global Html5QrcodeScanner
global.Html5QrcodeScanner = jest.fn().mockImplementation(() => mockScanner);

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  onloadend: null as any,
  result: 'data:image/jpeg;base64,test123',
};

global.FileReader = jest.fn().mockImplementation(() => mockFileReader) as any;

// Mock file input
const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

const mockOnItemsIdentified = jest.fn();
const mockOnClose = jest.fn();

const mockScanResult = {
  items: [
    {
      name: 'Mjölk',
      quantity: 1,
      unit: 'l',
      category: 'Mejeri',
      expiryDate: '2024-12-20',
      priceInfo: 15
    }
  ],
  totalCost: 15,
  detectedType: 'receipt' as const
};

const mockInventoryItem: InventoryItem = {
  id: '1',
  name: 'Mjölk',
  quantity: 1,
  unit: 'l',
  category: 'Mejeri',
  expiryDate: '2024-12-20',
  priceInfo: 15,
  addedDate: '2024-12-10',
  source: 'barcode'
};

describe('Scanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it('renders initial state with photo mode selected', () => {
    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    expect(screen.getByText('Lägg till varor')).toBeInTheDocument();
    expect(screen.getByText('Fota (AI)')).toBeInTheDocument();
    expect(screen.getByText('Scanna kod')).toBeInTheDocument();
    expect(screen.getByText('Starta Kamera / Ladda upp')).toBeInTheDocument();
    expect(screen.getByText('Tips!')).toBeInTheDocument();
  });

  it('switches to barcode mode when barcode button is clicked', () => {
    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    expect(screen.getByText('Rikta kameran mot streckkoden.')).toBeInTheDocument();
    expect(mockScanner.clear).not.toHaveBeenCalled();
  });

  it('switches back to photo mode when photo button is clicked', () => {
    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    // Switch to barcode first
    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    // Wait for scanner to be created
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Switch back to photo
    const photoButton = screen.getByText('Fota (AI)');
    fireEvent.click(photoButton);

    expect(screen.getByText('Starta Kamera / Ladda upp')).toBeInTheDocument();
    expect(mockScanner.clear).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: '' }); // Close button has no text
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('analyzes image successfully in photo mode', async () => {
    mockAnalyzeImage.mockResolvedValueOnce(mockScanResult);

    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    // Trigger the onloadend callback
    act(() => {
      mockFileReader.onloadend?.({
        target: { result: 'data:image/jpeg;base64,test123' }
      } as any);
    });

    await waitFor(() => {
      expect(mockAnalyzeImage).toHaveBeenCalledWith('test123');
      expect(mockOnItemsIdentified).toHaveBeenCalledWith(mockScanResult.items);
    });
  });

  it('shows error when image analysis fails', async () => {
    mockAnalyzeImage.mockRejectedValueOnce(new Error('Analysis failed'));

    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    act(() => {
      mockFileReader.onloadend?.({
        target: { result: 'data:image/jpeg;base64,test123' }
      } as any);
    });

    await waitFor(() => {
      expect(screen.getByText('Kunde inte analysera bilden. Försök igen.')).toBeInTheDocument();
    });

    expect(mockOnItemsIdentified).not.toHaveBeenCalled();
  });

  it('shows loading state during image analysis', async () => {
    mockAnalyzeImage.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockScanResult), 100)));

    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    act(() => {
      mockFileReader.onloadend?.({
        target: { result: 'data:image/jpeg;base64,test123' }
      } as any);
    });

    expect(screen.getByText('Analyserar bild...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOnItemsIdentified).toHaveBeenCalledWith(mockScanResult.items);
    });
  });

  it('initializes barcode scanner when switching to barcode mode', () => {
    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    // Wait for the timeout in useEffect
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(global.Html5QrcodeScanner).toHaveBeenCalledWith(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    expect(mockScanner.render).toHaveBeenCalled();
  });

  it('handles successful barcode scan', async () => {
    mockLookupBarcode.mockResolvedValueOnce(mockInventoryItem);

    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Get the success callback from the scanner render call
    const successCallback = mockScanner.render.mock.calls[0][0];

    // Simulate successful barcode scan
    await act(async () => {
      await successCallback('123456789');
    });

    expect(mockLookupBarcode).toHaveBeenCalledWith('123456789');
    expect(mockOnItemsIdentified).toHaveBeenCalledWith([{
      name: 'Mjölk',
      quantity: 1,
      unit: 'l',
      category: 'Mejeri',
      expiryDate: '2024-12-20',
      priceInfo: 15
    }]);
  });

  it('shows error when barcode lookup fails', async () => {
    mockLookupBarcode.mockResolvedValueOnce(null);

    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const successCallback = mockScanner.render.mock.calls[0][0];

    await act(async () => {
      await successCallback('123456789');
    });

    expect(screen.getByText('Kunde inte hitta vara för streckkod: 123456789. Lägg till manuellt.')).toBeInTheDocument();
    expect(mockOnItemsIdentified).not.toHaveBeenCalled();
  });

  it('shows error when barcode lookup throws', async () => {
    mockLookupBarcode.mockRejectedValueOnce(new Error('Network error'));

    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const successCallback = mockScanner.render.mock.calls[0][0];

    await act(async () => {
      await successCallback('123456789');
    });

    expect(screen.getByText('Fel vid uppslagning av streckkod.')).toBeInTheDocument();
    expect(mockOnItemsIdentified).not.toHaveBeenCalled();
  });

  it('shows loading state during barcode lookup', async () => {
    mockLookupBarcode.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockInventoryItem), 100)));

    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const successCallback = mockScanner.render.mock.calls[0][0];

    act(() => {
      successCallback('123456789');
    });

    // Wait for the loading state to appear
    await waitFor(() => {
      expect(screen.getByText('Hämtar produktinfo...')).toBeInTheDocument();
    });

    // Advance timers to resolve the lookup
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockOnItemsIdentified).toHaveBeenCalled();
    });
  });

  it('clears error when switching modes', () => {
    mockAnalyzeImage.mockRejectedValueOnce(new Error('Analysis failed'));

    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    // Trigger an error first
    const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    act(() => {
      mockFileReader.onloadend?.({
        target: { result: 'data:image/jpeg;base64,test123' }
      } as any);
    });

    // Switch to barcode mode
    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    expect(screen.queryByText('Kunde inte analysera bilden. Försök igen.')).not.toBeInTheDocument();
  });

  it('cleans up scanner on unmount', () => {
    const { unmount } = render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    unmount();

    expect(mockScanner.clear).toHaveBeenCalled();
  });

  it('cleans up scanner when switching from barcode to photo mode', () => {
    render(<Scanner onItemsIdentified={mockOnItemsIdentified} onClose={mockOnClose} />);

    // Switch to barcode
    const barcodeButton = screen.getByText('Scanna kod');
    fireEvent.click(barcodeButton);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Switch back to photo
    const photoButton = screen.getByText('Fota (AI)');
    fireEvent.click(photoButton);

    expect(mockScanner.clear).toHaveBeenCalled();
  });
});