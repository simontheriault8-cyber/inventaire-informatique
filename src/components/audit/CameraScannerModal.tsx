import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { sound } from '../../lib/audio';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'html5-qrcode-reader-element';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Récupérer les caméras disponibles
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Privilégier la caméra arrière (back/environment) pour le scan mobile
          const backCam = devices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('arrière')
          );
          const camId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(camId);
          startScanner(camId);
        } else {
          setErrorMsg('Aucune caméra détectée sur cet appareil.');
        }
      })
      .catch((err) => {
        setErrorMsg('Impossible d\'accéder à la caméra : ' + (err.message || 'Autorisation refusée'));
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraId: string) => {
    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 180 }, // Format rectangulaire adapté aux codes-barres 1D et QR
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Succès de détection
          sound.playSuccess();
          onScan(decodedText);
        },
        () => {
          // Frame sans code (ignorer)
        }
      );
      setIsScanning(true);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg('Erreur au démarrage du scanner : ' + err.message);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // Ignorer
      }
      setIsScanning(false);
      scannerRef.current = null;
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    await startScanner(newId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Scanner Caméra (Code 128 & QR)</h3>
              <p className="text-[11px] text-slate-400">Positionnez le code dans le cadre</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport Container */}
        <div className="relative bg-black flex items-center justify-center min-h-[320px] overflow-hidden">
          <div id={readerElementId} className="w-full h-full" />

          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <p className="text-xs text-rose-300 max-w-xs">{errorMsg}</p>
              <p className="text-[11px] text-slate-500">
                Vérifiez que votre navigateur autorise l'accès à la caméra (HTTPS requis).
              </p>
            </div>
          )}
        </div>

        {/* Camera Selector Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          {cameras.length > 1 ? (
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 outline-none"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Caméra ${c.id}`}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-slate-400">Caméra active</span>
          )}

          <button
            onClick={onClose}
            className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
