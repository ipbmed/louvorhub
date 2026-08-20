import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareQrCodeProps {
  url: string;
  size?: number;
  label?: string;
  className?: string;
}

/** QR code do link de compartilhamento (fundo claro para boa leitura na câmera). */
export const ShareQrCode: React.FC<ShareQrCodeProps> = ({
  url,
  size = 160,
  label = 'Aponte a câmera para abrir',
  className = '',
}) => {
  if (!url) return null;

  return (
    <div
      className={`inline-flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm ${className}`.trim()}
    >
      <QRCodeSVG
        value={url}
        size={size}
        level="M"
        bgColor="#ffffff"
        fgColor="#0c0a09"
        marginSize={1}
        title={url}
      />
      {label ? (
        <p className="text-[10px] font-medium text-stone-600 text-center max-w-[10rem] leading-snug">
          {label}
        </p>
      ) : null}
    </div>
  );
};
