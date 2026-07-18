import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/pricing/pricing.css";

const plans = [
  {
    name: "Free",
    target: "Para explorar sin compromiso",
    monthly: 0,
    annual: 0,
    seats: "Sin tarjeta · sin compromiso",
    description: "Accede a la plataforma en nuestro cloud. Todas las funciones disponibles.",
    features: ["Infraestructura gestionada", "Actualizaciones automáticas", "Soporte de comunidad"],
  },
  {
    name: "Starter",
    target: "Cuenta gratuita · acceso a grupos",
    monthly: 0,
    annual: 0,
    seats: "1 cuenta gratuita",
    description: "Crea una cuenta gratuita y colabora mediante grupos.",
    features: ["Todo lo del plan Anónimo", "Acceso a grupos", "Formación básica"],
  },
  {
    name: "Individual",
    target: "Uso personal · licencia única",
    monthly: 9,
    annual: 90,
    seats: "1 licencia personal",
    description: "Infraestructura gestionada para un único usuario.",
    features: ["Todo lo de Starter", "Backups diarios", "Contacto directo"],
  },
  {
    name: "Business",
    target: "Equipos de 5 a 100 usuarios",
    monthly: 6,
    annual: 60,
    seats: "1 admin + hasta 99 licencias",
    description: "El administrador gestiona el equipo y asigna licencias.",
    features: ["Panel de administración", "Onboarding asistido", "Descuentos por volumen"],
  },
];
function euro(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PricingPage() {
  useBodyClass("pricing-page");
  const navigate = useNavigate(),
    [annual, setAnnual] = useState(false),
    [calculator, setCalculator] = useState(false),
    [tier, setTier] = useState<"developer" | "business">("developer"),
    [seats, setSeats] = useState(5),
    [selfHosted, setSelfHosted] = useState(false),
    [contact, setContact] = useState(false);
  useEffect(() => {
    document.body.style.visibility = "";
  }, []);
  const amount = useMemo(() => {
    if (tier === "developer") return annual ? 90 : 9;
    const unit = seats >= 50 ? 6 : seats >= 20 ? 7 : 8;
    return unit * seats * (annual ? 10 : 1) + (selfHosted ? 0 : 0);
  }, [tier, seats, annual, selfHosted]);
  const checkout = () =>
    void navigate(
      `/checkout/?tier=${tier}&seats=${tier === "developer" ? 1 : seats}&interval=${annual ? "year" : "month"}&selfHosted=${selfHosted ? 1 : 0}`,
    );
  return (
    <>
      <header className="pr-header">
        <Link className="pr-logo" to="/">
          iAgents<span>Hub</span>
        </Link>
        <div className="pr-header-divider" />
        <span className="pr-header-label">Precios</span>
        <div className="pr-header-spacer" />
        <Link to="/about" className="pr-header-link">
          Acerca de
        </Link>
        <Link to="/login/" className="pr-header-link">
          Iniciar sesión
        </Link>
        <Link to="/register/" className="pr-header-cta">
          Empezar gratis
        </Link>
      </header>
      <main className="pr-main">
        <div className="pr-hero">
          <div className="pr-hero-badge">Precios</div>
          <h1 className="pr-hero-title">
            Pagas el servicio,
            <br />
            no el software.
          </h1>
          <p className="pr-hero-subtitle">
            El código es open source. Despliégalo tú mismo gratis, o deja que lo gestionemos
            nosotros.
          </p>
          <div className="pr-toggle">
            <button
              className={`pr-toggle-btn${!annual ? " active" : ""}`}
              onClick={() => setAnnual(false)}
            >
              Mensual
            </button>
            <button
              className={`pr-toggle-btn${annual ? " active" : ""}`}
              onClick={() => setAnnual(true)}
            >
              Anual <span className="pr-toggle-badge">2 meses gratis</span>
            </button>
          </div>
        </div>
        <div className="pr-oss">
          <span aria-hidden="true">◉</span>
          <div className="pr-oss-body">
            <strong>El código es tuyo</strong>
            <span>
              iAgentsHub es open source. Descárgalo, despliégalo en tu servidor y úsalo sin coste de
              plataforma.
            </span>
          </div>
          <a
            href="https://github.com/iagentshub/iAgents"
            target="_blank"
            rel="noreferrer"
            className="pr-oss-cta"
          >
            Ver repositorio →
          </a>
        </div>
        <div className="pr-grid">
          {plans.map((plan) => (
            <article className="pr-card" key={plan.name}>
              <div className="pr-card-head">
                <div className="pr-plan-name">{plan.name}</div>
                <div className="pr-plan-target">{plan.target}</div>
                <div className="pr-price-wrap">
                  <span className="pr-price">
                    {plan.monthly === 0 ? "Gratis" : euro(annual ? plan.annual : plan.monthly)}
                  </span>
                  {plan.monthly > 0 && (
                    <span className="pr-price-period">/ {annual ? "año" : "mes"}</span>
                  )}
                </div>
                <div className="pr-seats">{plan.seats}</div>
              </div>
              <p className="pr-service-desc">{plan.description}</p>
              <div className="pr-service">
                <div className="pr-service-label">Lo que gestionamos por ti</div>
                <ul className="pr-service-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <div className="pr-actions">
          <button id="open-plan-modal" className="pr-btn" onClick={() => setCalculator(true)}>
            Configurar un plan
          </button>
          <button className="pr-btn pr-btn--ghost" onClick={() => setContact(true)}>
            Formación y consultoría
          </button>
        </div>
      </main>
      {calculator && (
        <div
          className="modal-bg"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCalculator(false);
          }}
        >
          <div className="modal-box pr-plan-modal">
            <div className="modal-header">
              <span className="modal-title">Configura tu plan</span>
              <button className="modal-close" onClick={() => setCalculator(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="pr-toggle">
                <button
                  className={`pr-toggle-btn${tier === "developer" ? " active" : ""}`}
                  onClick={() => setTier("developer")}
                >
                  Individual
                </button>
                <button
                  className={`pr-toggle-btn${tier === "business" ? " active" : ""}`}
                  onClick={() => setTier("business")}
                >
                  Business
                </button>
              </div>
              {tier === "business" && (
                <div className="field">
                  <label htmlFor="plan-seats">Licencias: {seats}</label>
                  <input
                    id="plan-seats"
                    type="range"
                    min="2"
                    max="100"
                    value={seats}
                    onChange={(event) => setSeats(Number(event.target.value))}
                  />
                </div>
              )}
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={selfHosted}
                  onChange={(event) => setSelfHosted(event.target.checked)}
                />
                <span className="toggle-track" />
                Despliegue self-hosted
              </label>
              <div className="co-summary-total">
                <span>{euro(amount)}</span>
                <span>/ {annual ? "año" : "mes"}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setCalculator(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={checkout}>
                Continuar al pago
              </button>
            </div>
          </div>
        </div>
      )}
      {contact && <ContactModal onClose={() => setContact(false)} />}
    </>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: () =>
      api.post("/api/admin/contact-requests", {
        type: "consulting",
        label: "solicitud_formacion",
        name,
        email,
        message,
      }),
    onSuccess: onClose,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate();
  };
  return (
    <div className="modal-bg" role="dialog" aria-modal="true">
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Solicitar información</span>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label>Nombre</label>
              <input required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="field">
              <label>Mensaje</label>
              <textarea
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
            {send.error && (
              <div className="form-error">
                {send.error instanceof ApiError ? send.error.message : "No se pudo enviar"}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={send.isPending}>
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

