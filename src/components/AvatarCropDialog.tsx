import React, { useEffect, useRef, useState } from 'react';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';

const OUTPUT_SIZE = 200;

interface AvatarCropDialogProps {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

/** Recorte quadrado com zoom, exportando JPEG 200×200. */
export const AvatarCropDialog: React.FC<AvatarCropDialogProps> = ({
  imageSrc,
  onCancel,
  onConfirm,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const viewSize = 280;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const fit = Math.max(viewSize / img.width, viewSize / img.height);
      setMinScale(fit);
      setScale(fit);
      setOffset({ x: 0, y: 0 });
      setReady(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const clampOffset = (nextScale: number, x: number, y: number) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const drawnW = img.width * nextScale;
    const drawnH = img.height * nextScale;
    const maxX = Math.max(0, (drawnW - viewSize) / 2);
    const maxY = Math.max(0, (drawnH - viewSize) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(clampOffset(scale, dragRef.current.ox + dx, dragRef.current.oy + dy));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const changeScale = (next: number) => {
    const clamped = Math.min(minScale * 3, Math.max(minScale, next));
    setScale(clamped);
    setOffset((prev) => clampOffset(clamped, prev.x, prev.y));
  };

  const exportCrop = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = OUTPUT_SIZE / viewSize;
    const drawnW = img.width * scale;
    const drawnH = img.height * scale;
    const dx = (viewSize - drawnW) / 2 + offset.x;
    const dy = (viewSize - drawnH) / 2 + offset.y;

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(
      img,
      dx * ratio,
      dy * ratio,
      drawnW * ratio,
      drawnH * ratio,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      'image/jpeg',
      0.9,
    );
  };

  const img = imgRef.current;

  return (
    <div className="fixed inset-0 z-[60] bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-4 space-y-4 text-stone-100 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-bold text-emerald-100 tracking-tight">Ajustar foto</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-stone-400">
          Arraste para posicionar e use o zoom. A foto será salva em {OUTPUT_SIZE}×{OUTPUT_SIZE}px.
        </p>

        <div
          className="relative mx-auto overflow-hidden bg-stone-950 border border-stone-700 touch-none cursor-grab active:cursor-grabbing"
          style={{ width: viewSize, height: viewSize }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {ready && img && (
            <img
              src={imageSrc}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none pointer-events-none"
              style={{
                width: img.width * scale,
                height: img.height * scale,
                left: (viewSize - img.width * scale) / 2 + offset.x,
                top: (viewSize - img.height * scale) / 2 + offset.y,
              }}
            />
          )}
          <div className="absolute inset-0 ring-2 ring-emerald-400/70 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeScale(scale / 1.1)}
            className="p-2 bg-stone-800 border border-stone-700 rounded-button text-stone-300"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={minScale}
            max={minScale * 3}
            step={0.01}
            value={scale}
            onChange={(e) => changeScale(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <button
            type="button"
            onClick={() => changeScale(scale * 1.1)}
            className="p-2 bg-stone-800 border border-stone-700 rounded-button text-stone-300"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-xs font-semibold bg-stone-800 border border-stone-700 rounded-button text-stone-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={exportCrop}
            className="px-3 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-stone-950 rounded-button inline-flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Usar foto
          </button>
        </div>
      </div>
    </div>
  );
};
