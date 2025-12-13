import React, { useRef, useState, useEffect } from 'react';
import { analyzeImage, lookupBarcode } from '../services/geminiService';
import { InventoryItem } from '../types';

// Declare global html5-qrcode type since it's loaded via CDN
declare class Html5QrcodeScanner {
  constructor(elementId: string, config: any, verbose: boolean);
  render(onSuccess: (decodedText: string) => void, onError: (error: any) => void): void;
  clear(): Promise<void>;
}

interface Props {
  onItemsIdentified: (items: Omit<InventoryItem, 'id' | 'addedDate' | 'source'>[]) => void;
  onClose: () => void;
}

const Scanner: React.FC<Props> = ({ onItemsIdentified, onClose }) => {
  const [mode, setMode] = useState<'photo' | 'barcode'>('photo');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    if (mode === 'barcode') {
      // Small delay to ensure DOM is ready and previous cleanup is done
      const timer = setTimeout(() => {
        if (!mounted) return;

        // Ensure element exists before creating scanner
        if (!document.getElementById("reader")) return;

        try {
          const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );
          scannerRef.current = scanner;
          
          scanner.render(
            async (decodedText: string) => {
              // Pause/Clear scanner on success to prevent multiple reads
              if (scannerRef.current) {
                await scannerRef.current.clear();
                scannerRef.current = null;
              }
              
              setIsAnalyzing(true);
              try {
                 const item = await lookupBarcode(decodedText);
                 if (item) {
                   // Remove ID/AddedDate/Source as parent handles that
                   const { id, addedDate, source, ...rest } = item;
                   onItemsIdentified([rest]);
                 } else {
                   setError(`Kunde inte hitta vara för streckkod: ${decodedText}. Lägg till manuellt.`);
                   // We don't close automatically here, allowing user to see error or switch mode
                 }
              } catch (err) {
                 setError("Fel vid uppslagning av streckkod.");
              } finally {
                 setIsAnalyzing(false);
              }
            },
            (errorMessage: any) => {
              // ignore scan errors, they happen every frame
            }
          );
        } catch (e) {
          console.error("Scanner initialization failed", e);
        }
      }, 100);

      return () => {
        mounted = false;
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch((err: any) => console.error("Failed to clear scanner", err));
          scannerRef.current = null;
        }
      };
    }
  }, [mode, onItemsIdentified]);


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const result = await analyzeImage(base64String);
        onItemsIdentified(result.items);
      } catch (err) {
        setError("Kunde inte analysera bilden. Försök igen.");
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 relative overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Lägg till varor</h2>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setMode('photo'); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'photo' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}
          >
            Fota (AI)
          </button>
          <button
            onClick={() => { setMode('barcode'); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'barcode' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'}`}
          >
            Scanna kod
          </button>
        </div>

        {isAnalyzing ? (
          <div className="flex flex-col items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
            <p className="text-gray-600 animate-pulse">
              {mode === 'photo' ? 'Analyserar bild...' : 'Hämtar produktinfo...'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            {mode === 'photo' ? (
              <>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-sm text-emerald-800">
                  <p className="font-semibold mb-1">Tips!</p>
                  <p>Du kan ta kort på ett <strong>kvitto</strong> för att lägga till allt på en gång, eller fota <strong>matvaran</strong> direkt.</p>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Starta Kamera / Ladda upp
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center">
                 <div id="reader" className="w-full overflow-hidden rounded-lg bg-black"></div>
                 <p className="text-xs text-gray-500 mt-2 text-center">Rikta kameran mot streckkoden.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;