import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, SwitchCamera, X } from 'lucide-react';

interface CameraCaptureDialogProps {
  onCancel: () => void;
  onCapture: (imageSrc: string) => void;
}

/** Captura foto pela câmera do dispositivo (não abre a galeria). */
export const CameraCaptureDialog: React.FC<CameraCaptureDialogProps> = ({
  onCancel,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setReady(false);
      setError(null);
      setBusy(true);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador não permite acesso à câmera.');
        setBusy(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setError(
          'Não foi possível acessar a câmera. Verifique a permissão do navegador e tente novamente.',
        );
      } finally {
        if (!cancelled) setBusy(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !ready) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Espelha selfie (facingMode user) para bater com o preview
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    onCapture(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-4 space-y-4 text-stone-100 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-bold text-emerald-100 tracking-tight">Tirar foto</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mx-auto w-full aspect-square max-w-[320px] overflow-hidden bg-stone-950 border border-stone-700 rounded-xl">
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-stone-400 text-xs z-10">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              Abrindo câmera…
            </div>
          )}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          {!ready && !busy && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-500">
              Aguardando câmera…
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() =>
              setFacingMode((mode) => (mode === 'user' ? 'environment' : 'user'))
            }
            disabled={Boolean(error)}
            className="px-3 py-2 text-xs font-semibold bg-stone-800 border border-stone-700 rounded-button text-stone-300 inline-flex items-center gap-1.5 disabled:opacity-40"
            title="Alternar câmera"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            Alternar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 text-xs font-semibold bg-stone-800 border border-stone-700 rounded-button text-stone-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={capture}
              disabled={!ready}
              className="px-3 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-stone-950 rounded-button inline-flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              Capturar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
