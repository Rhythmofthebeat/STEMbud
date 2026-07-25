import { useEffect, useRef, useState } from 'react';

interface Props {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError('Camera access is needed to scan a worksheet.'));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCapturing(true);

    // Crop to the guide box: a centered worksheet-proportioned rectangle (~78% of the frame height)
    const boxHeight = video.videoHeight * 0.78;
    const boxWidth = boxHeight * (8.5 / 11);
    const sx = Math.max(0, (video.videoWidth - boxWidth) / 2);
    const sy = Math.max(0, (video.videoHeight - boxHeight) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = boxWidth;
    canvas.height = boxHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, sx, sy, boxWidth, boxHeight, 0, 0, boxWidth, boxHeight);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (blob) onCapture(blob);
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div className="camera-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="camera-modal">
        <div className="camera-modal-header">
          <span>Scan worksheet</span>
          <button className="camera-close" onClick={onClose} title="Close">×</button>
        </div>
        {error ? (
          <div className="camera-error">{error}</div>
        ) : (
          <div className="camera-viewport">
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="camera-guide-box" />
          </div>
        )}
        <p className="camera-hint">Line your worksheet up with the box, then capture.</p>
        <button className="camera-capture-btn" onClick={handleCapture} disabled={!!error || capturing}>
          {capturing ? 'Capturing…' : 'Capture'}
        </button>
      </div>
    </div>
  );
}
