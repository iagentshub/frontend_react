import { useEffect, useRef, useState } from "react";

export function AvatarCrop({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => setImage(next);
    next.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context || !image) return;
    const size = 320;
    const base = Math.max(size / image.width, size / image.height) * zoom;
    const width = image.width * base, height = image.height * base;
    context.clearRect(0, 0, size, size);
    context.drawImage(image, (size - width) / 2 + x, (size - height) / 2 + y, width, height);
  }, [image, x, y, zoom]);
  const confirm = () => canvas.current?.toBlob((blob) => {
    if (blob) onConfirm(new File([blob], "avatar.webp", { type: "image/webp" }));
  }, "image/webp", .9);
  return <div className="modal-bg" role="dialog" aria-modal="true"><div className="modal-box" style={{ maxWidth: 440 }}>
    <div className="modal-header"><h3 className="modal-title">Recortar foto</h3><button className="modal-close" onClick={onCancel}>×</button></div>
    <div className="modal-body" style={{ textAlign: "center" }}>
      <canvas ref={canvas} width={320} height={320} style={{ width: 280, maxWidth: "100%", borderRadius: "50%", border: "2px solid var(--line)" }} />
      <label className="field">Zoom<input type="range" min={1} max={3} step={.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <div className="form-row-2"><label className="field">Horizontal<input type="range" min={-120} max={120} value={x} onChange={(event) => setX(Number(event.target.value))} /></label><label className="field">Vertical<input type="range" min={-120} max={120} value={y} onChange={(event) => setY(Number(event.target.value))} /></label></div>
    </div>
    <div className="modal-footer"><button className="btn btn-ghost" onClick={onCancel}>Cancelar</button><button className="btn btn-primary" onClick={confirm}>Usar esta foto</button></div>
  </div></div>;
}
