import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    const width = image.width * base,
      height = image.height * base;
    context.clearRect(0, 0, size, size);
    context.drawImage(image, (size - width) / 2 + x, (size - height) / 2 + y, width, height);
  }, [image, x, y, zoom]);
  const confirm = () =>
    canvas.current?.toBlob(
      (blob) => {
        if (blob) onConfirm(new File([blob], "avatar.webp", { type: "image/webp" }));
      },
      "image/webp",
      0.9,
    );
  return (
    <div className="modal-bg" role="dialog" aria-modal="true">
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3 className="modal-title">{t("legacy.text_3929ed9d97a0")}</h3>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: "center" }}>
          <canvas
            ref={canvas}
            width={320}
            height={320}
            style={{
              width: 280,
              maxWidth: "100%",
              borderRadius: "50%",
              border: "2px solid var(--line)",
            }}
          />

          <label className="field">
            {t("legacy.text_9b3cbed5c490")}
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>

          <div className="form-row-2">
            <label className="field">
              {t("legacy.text_4f57a1ce99e6")}
              <input
                type="range"
                min={-120}
                max={120}
                value={x}
                onChange={(event) => setX(Number(event.target.value))}
              />
            </label>
            <label className="field">
              {t("legacy.text_4b937cc841d8")}
              <input
                type="range"
                min={-120}
                max={120}
                value={y}
                onChange={(event) => setY(Number(event.target.value))}
              />
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>
            {t("agents.scan.folder_cancel_btn")}
          </button>
          <button className="btn btn-primary" onClick={confirm}>
            {t("legacy.text_8d3b687bf1bb")}
          </button>
        </div>
      </div>
    </div>
  );
}
