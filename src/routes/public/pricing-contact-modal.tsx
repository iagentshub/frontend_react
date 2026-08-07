import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";

/**
 * Formulario de contacto de pricing (planes que no tienen checkout directo:
 * Anónimo/Novato, Tropa y Legión).
 *
 * Era una función anidada dentro de pricing-page.tsx; vive aquí porque no
 * comparte estado con el resto de la página, solo el tipo y título que decide
 * el llamador.
 */
export function PricingContactModal({
  type,
  title,
  onClose,
}: {
  type: string;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: () =>
      api.post("/api/admin/contact-requests", {
        type,
        label: "solicitud_formacion",
        name,
        email,
        message,
      }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    send.mutate();
  };
  return (
    <div
      className="pr-modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="pr-modal">
        <button className="pr-modal-close" aria-label={t("pricing.close")} onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="pr-modal-title">{title}</div>
        <div className="pr-modal-subtitle" />

        <form className="pr-modal-form" onSubmit={submit}>
          <div className="pr-modal-field">
            <label className="pr-modal-label" htmlFor="modal-name">
              {t("pricing.contact_name")}
            </label>
            <input
              className="pr-modal-input"
              type="text"
              id="modal-name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="pr-modal-field">
            <label className="pr-modal-label" htmlFor="modal-email">
              {t("pricing.contact_email")}
            </label>
            <input
              className="pr-modal-input"
              type="email"
              id="modal-email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="pr-modal-field">
            <label className="pr-modal-label" htmlFor="modal-message">
              {t("pricing.contact_message")}
            </label>
            <textarea
              className="pr-modal-input pr-modal-textarea"
              id="modal-message"
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          {send.isSuccess && (
            <div className="pr-modal-status pr-modal-status--ok">
              {t("pricing.contact_success")}
            </div>
          )}
          {send.isError && (
            <div className="pr-modal-status pr-modal-status--err">
              {send.error instanceof ApiError ? send.error.message : t("pricing.contact_error")}
            </div>
          )}

          <button type="submit" className="pr-btn" disabled={send.isPending}>
            {t("pricing.contact_send")}
          </button>
        </form>
      </div>
    </div>
  );
}
