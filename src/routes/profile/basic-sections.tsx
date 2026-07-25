import { useTranslation } from "react-i18next";
import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import i18n from "@/i18n";
import { api, ApiError } from "@/api/client";
import { useTheme, type ThemeId } from "@/theme/theme-context";
import type { ProfileSession, ProfileSettings, SocialProfile } from "./types";
import { AvatarCrop } from "./avatar-crop";

const languages = [
  ["es", "🇪🇸", "Español"],
  ["en", "🇬🇧", "English"],
  ["fr", "🇫🇷", "Français"],
  ["de", "🇩🇪", "Deutsch"],
  ["pt", "🇵🇹", "Português"],
  ["it", "🇮🇹", "Italiano"],
  ["zh", "🇨🇳", "中文"],
  ["ja", "🇯🇵", "日本語"],
  ["ar", "🇸🇦", "العربية"],
] as const;

function message(error: unknown): string {
  return error instanceof ApiError ? error.message : i18n.t("common.errors.save_change");
}

export function AccountSection({
  session,
  onAvatarSaved,
}: {
  session: ProfileSession;
  onAvatarSaved: () => void;
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const password = useMutation({
    mutationFn: () =>
      api.post("/api/auth/change-password", { current_password: current, new_password: next }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      setNotice(i18n.t("dynamic.text_0d0bf4184627"));
    },
  });
  const avatar = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      return api.upload("/api/auth/me/avatar", form);
    },
    onSuccess: () => {
      setNotice("Foto de perfil actualizada.");
      onAvatarSaved();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setNotice("");
    if (!current || !next || !confirm) {
      setNotice("Completa todos los campos.");
      return;
    }
    if (next !== confirm) {
      setNotice(i18n.t("dynamic.text_ebb21b20058c"));
      return;
    }
    password.mutate();
  };
  const role =
    session.role === "standard" || session.role === "user"
      ? i18n.t("dynamic.text_53be8a17c194")
      : session.role === "admin"
        ? "Administrador"
        : session.role === "gestor"
          ? "Gestor"
          : "Invitado";
  const auth =
    session.auth_method === "internal" || !session.auth_method
      ? i18n.t("dynamic.text_9d970fdccb0f")
      : session.auth_method;
  return (
    <>
      <div className="section-title">{t("profile.nav.account")}</div>

      <div className="profile-info-block">
        <div className="profile-info-row">
          <span className="profile-info-label">{t("admin.table.user")}</span>
          <span className="profile-info-value">{session.username}</span>
        </div>

        <div className="profile-info-row">
          <span className="profile-info-label">{t("admin.table.role")}</span>
          <span className="profile-info-value">{role}</span>
        </div>

        <div className="profile-info-row">
          <span className="profile-info-label">{t("profile.field_auth")}</span>
          <span className="profile-info-value">{auth}</span>
        </div>
      </div>

      <div className="section-subtitle">{t("legacy.text_4eb8e8bcea72")}</div>

      <p className="section-desc">{t("legacy.text_cf28c1972e02")}</p>

      <button
        className="btn btn-ghost"
        disabled={avatar.isPending}
        onClick={() => fileRef.current?.click()}
      >
        {avatar.isPending ? t("profile.avatar.uploading") : t("profile.avatar.select_btn")}
      </button>

      <input
        ref={fileRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setAvatarFile(file);
          event.target.value = "";
        }}
      />

      {avatarFile && (
        <AvatarCrop
          file={avatarFile}
          onCancel={() => setAvatarFile(null)}
          onConfirm={(file) => {
            setAvatarFile(null);
            avatar.mutate(file);
          }}
        />
      )}

      {(session.auth_method === "internal" || !session.auth_method) && (
        <form onSubmit={submit} style={{ marginTop: 28 }}>
          <div className="section-subtitle">{t("profile.password_title")}</div>

          <div className="field">
            <label htmlFor="profile-current-password">{t("profile.password.field_current")}</label>
            <input
              id="profile-current-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="profile-new-password">{t("profile.password.field_new")}</label>
            <input
              id="profile-new-password"
              className="input"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="profile-confirm-password">{t("profile.password.field_confirm")}</label>
            <input
              id="profile-confirm-password"
              className="input"
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>

          <div className="profile-form-footer">
            <button className="btn btn-primary" disabled={password.isPending}>
              {password.isPending ? t("common.actions.saving") : t("profile.password.save_btn")}
            </button>
          </div>
        </form>
      )}

      {(notice || password.error || avatar.error) && (
        <p className={password.error || avatar.error ? "form-error" : "field-hint"} role="status">
          {password.error ? message(password.error) : avatar.error ? message(avatar.error) : notice}
        </p>
      )}
    </>
  );
}

export function SocialSection({
  session,
  initial,
  onSaved,
}: {
  session: ProfileSession;
  initial: SocialProfile;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [bio, setBio] = useState(initial.bio ?? "");
  const [selectedLanguages, setSelectedLanguages] = useState(initial.languages ?? []);
  const [email, setEmail] = useState(initial.email_public ?? "");
  const [github, setGithub] = useState(
    (initial.github ?? "").replace(/^https:\/\/github\.com\//, ""),
  );
  const [cv, setCv] = useState(initial.cv ?? "");
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      api.put("/api/auth/me/profile", {
        bio: bio.trim() || null,
        languages: selectedLanguages,
        email_public: email.trim() || null,
        github: github.trim()
          ? github.startsWith("https://")
            ? github.trim()
            : `https://github.com/${github.trim().replace(/^@/, "")}`
          : null,
        cv: cv.trim() || null,
      }),
    onSuccess: () => {
      setSaved(true);
      onSaved();
    },
  });
  const toggleLanguage = (id: string) =>
    setSelectedLanguages((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  return (
    <>
      <div className="section-title">{t("profile.nav.social")}</div>

      <p className="section-desc">
        {t("profile.social.desc")}
        <Link
          className="link-subtle"
          target="_blank"
          to={`/u/${encodeURIComponent(session.username)}`}
        >
          {t("profile.social.view_profile")}
        </Link>
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);
          save.mutate();
        }}
      >
        <div className="field">
          <label htmlFor="profile-bio">{t("profile.social.field_bio")}</label>
          <textarea
            id="profile-bio"
            className="input"
            rows={3}
            maxLength={500}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
          <span className="field-hint">{bio.length}/500</span>
        </div>

        <div className="field">
          <label>{t("profile.social.field_languages")}</label>
          <div className="social-lang-grid">
            {languages.map(([id, flag, label]) => (
              <label className="social-lang-item" key={id}>
                <input
                  type="checkbox"
                  checked={selectedLanguages.includes(id)}
                  onChange={() => toggleLanguage(id)}
                />
                <span>{flag}</span>
                <span>{id === "es" ? t("common.languages.spanish") : label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="profile-public-email">{t("profile.social.field_email")}</label>
          <input
            id="profile-public-email"
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="profile-github">{t("errors.fields.github")}</label>
          <div className="input-prefix-wrap">
            <span className="input-prefix">{t("legacy.text_bfcb7088d6a0")}</span>
            <input
              id="profile-github"
              className="input input-with-prefix"
              value={github}
              onChange={(event) => setGithub(event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="profile-cv">{t("profile.social.field_cv")}</label>
          <p className="field-hint">{t("legacy.text_c58cbc60f500")}</p>
          <textarea
            id="profile-cv"
            className="input social-cv-textarea"
            rows={10}
            value={cv}
            onChange={(event) => setCv(event.target.value)}
          />
        </div>

        {save.error && (
          <p className="form-error" role="alert">
            {message(save.error)}
          </p>
        )}
        {saved && (
          <p className="field-hint" role="status">
            {t("legacy.text_1528574f94e9")}
          </p>
        )}

        <div className="profile-form-footer">
          <button className="btn btn-primary" disabled={save.isPending}>
            {save.isPending ? t("common.actions.saving") : t("profile.social.save_btn")}
          </button>
        </div>
      </form>
    </>
  );
}

export function PreferencesSection({ settings }: { settings: ProfileSettings }) {
  const { t } = useTranslation();
  const [language, setLanguage] = useState(
    settings.language ?? localStorage.getItem("ga-lang") ?? "es",
  );
  const [timeout, setTimeoutValue] = useState(localStorage.getItem("ga-chat-timeout") ?? "0");
  const [sendOnEnter, setSendOnEnter] = useState(
    localStorage.getItem("ga-send-on-enter") !== "false",
  );
  const [pageSize, setPageSize] = useState(localStorage.getItem("ga-page-size") ?? "24");
  const saveLanguage = useMutation({
    mutationFn: (value: string) => api.put("/api/settings", { language: value }),
  });
  const pickLanguage = (value: string) => {
    setLanguage(value);
    localStorage.setItem("ga-lang", value);
    void i18n.changeLanguage(value);
    saveLanguage.mutate(value);
  };
  return (
    <>
      <div className="section-title">{t("profile.nav.preferences")}</div>

      <div className="section-subtitle">{t("errors.fields.language")}</div>

      <div className="lang-picker">
        {languages.slice(0, 2).map(([id, flag, label]) => (
          <button
            type="button"
            className={`lang-option${language === id ? " lang-option--active" : ""}`}
            key={id}
            onClick={() => pickLanguage(id)}
          >
            <span className="lang-flag">{flag}</span>
            <span>{label}</span>
            {language === id && <span className="lang-check">✓</span>}
          </button>
        ))}
      </div>

      <div className="section-subtitle" style={{ marginTop: 28 }}>
        {t("agents.modal.field_timeout")}
      </div>
      <p className="section-desc">{t("legacy.text_827608c7b113")}</p>

      <select
        className="select pref-select"
        value={timeout}
        onChange={(event) => {
          setTimeoutValue(event.target.value);
          localStorage.setItem("ga-chat-timeout", event.target.value);
        }}
      >
        <option value="0">{t("profile.timeout_indefinido")}</option>
        <option value="60">{t("profile.timeout_1")}</option>
        <option value="120">{t("profile.timeout_2")}</option>
        <option value="300">{t("profile.timeout_5")}</option>
        <option value="600">{t("profile.timeout_10")}</option>
      </select>

      <div className="pref-row">
        <div className="pref-row-info">
          <div className="section-subtitle">{t("profile.send_enter_title")}</div>
          <p className="section-desc">{t("profile.send_enter_desc")}</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={sendOnEnter}
            onChange={(event) => {
              setSendOnEnter(event.target.checked);
              localStorage.setItem("ga-send-on-enter", String(event.target.checked));
            }}
          />
          <span className="toggle-track" />
        </label>
      </div>

      <div className="section-subtitle" style={{ marginTop: 28 }}>
        {t("legacy.text_3b67a4f6935a")}
      </div>
      <p className="section-desc">{t("legacy.text_ce266cfd4680")}</p>

      <select
        className="select pref-select"
        value={pageSize}
        onChange={(event) => {
          setPageSize(event.target.value);
          localStorage.setItem("ga-page-size", event.target.value);
        }}
      >
        <option value="12">12</option>
        <option value="24">24</option>
        <option value="48">48</option>
        <option value="96">96</option>
      </select>

      {saveLanguage.error && <p className="form-error">{message(saveLanguage.error)}</p>}
    </>
  );
}

export function StyleSection() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [density, setDensity] = useState(localStorage.getItem("ga-chat-density") ?? "normal");
  const saveTheme = useMutation({
    mutationFn: (value: ThemeId) => api.put("/api/settings", { theme: value }),
  });
  const [mode, accent] = theme.split("-") as [
    "dark" | "light",
    "red" | "blue" | "orange" | "purple",
  ];
  const pick = (nextMode: "dark" | "light", nextAccent: "red" | "blue" | "orange" | "purple") => {
    const value: ThemeId = `${nextMode}-${nextAccent}`;
    setTheme(value);
    saveTheme.mutate(value);
  };
  const accentColor: Record<typeof accent, string> = {
    red: "#ff3b30",
    blue: "#2997ff",
    orange: "#ff9f0a",
    purple: "#bf5af2",
  };
  return (
    <>
      <div className="section-title">{t("profile.nav.style")}</div>
      <div className="section-subtitle">{t("errors.fields.theme")}</div>

      <div className="theme-mode-row">
        <button
          className={`theme-mode-btn${mode === "dark" ? " theme-mode-btn--active" : ""}`}
          onClick={() => pick("dark", accent)}
        >
          <span className="theme-mode-dot" style={{ background: "#0a0a0a" }} />
          {t("profile.theme_dark")}
          {mode === "dark" && " ✓"}
        </button>
        <button
          className={`theme-mode-btn${mode === "light" ? " theme-mode-btn--active" : ""}`}
          onClick={() => pick("light", accent)}
        >
          <span className="theme-mode-dot" style={{ background: "#f5f5f7" }} />
          {t("profile.theme_light")}
          {mode === "light" && " ✓"}
        </button>
      </div>

      <div className="theme-accent-row">
        {(["red", "blue", "orange", "purple"] as const).map((value) => (
          <button
            key={value}
            className={`theme-accent-btn${accent === value ? " theme-accent-btn--active" : ""}`}
            onClick={() => pick(mode, value)}
          >
            <span className="theme-accent-dot" style={{ background: accentColor[value] }} />
            {{ red: "Rojo", blue: "Azul", orange: "Naranja", purple: "Morado" }[value]}
            {accent === value && " ✓"}
          </button>
        ))}
      </div>

      <div className="section-subtitle" style={{ marginTop: 28 }}>
        {t("profile.density_title")}
      </div>
      <div className="density-picker">
        <button
          className={`density-option${density === "normal" ? " density-option--active" : ""}`}
          onClick={() => {
            setDensity("normal");
            localStorage.setItem("ga-chat-density", "normal");
          }}
        >
          {t("profile.density_normal")}
          {density === "normal" && " ✓"}
        </button>
        <button
          className={`density-option${density === "compact" ? " density-option--active" : ""}`}
          onClick={() => {
            setDensity("compact");
            localStorage.setItem("ga-chat-density", "compact");
          }}
        >
          {t("profile.density_compact")}
          {density === "compact" && " ✓"}
        </button>
      </div>

      <div className={`density-preview${density === "compact" ? " density-preview--compact" : ""}`}>
        <div className="dp-msg dp-assistant">
          <div className="dp-avatar">{t("legacy.text_6dcd4ce23d88")}</div>
          <div className="dp-bubble">{t("profile.density_preview_1")}</div>
        </div>
        <div className="dp-msg dp-user">
          <div className="dp-avatar">{t("legacy.text_c2c53d669482")}</div>
          <div className="dp-bubble">{t("profile.density_preview_2")}</div>
        </div>
        <div className="dp-msg dp-assistant">
          <div className="dp-avatar">{t("legacy.text_6dcd4ce23d88")}</div>
          <div className="dp-bubble">{t("legacy.text_82310643c9d2")}</div>
        </div>
      </div>

      {saveTheme.error && <p className="form-error">{message(saveTheme.error)}</p>}
    </>
  );
}

export function ProvidersSection({
  connections,
}: {
  connections: Array<{
    id: string;
    name?: string;
    label?: string;
    type?: string;
    tokens_in?: number;
    tokens_out?: number;
  }>;
}) {
  const { t } = useTranslation();
  const grouped = connections.reduce<Record<string, typeof connections>>((result, connection) => {
    const type = connection.type || "other";
    (result[type] ??= []).push(connection);
    return result;
  }, {});
  return (
    <>
      <div className="section-title">{t("auth.stat_providers")}</div>
      <p className="section-desc">{t("legacy.text_f1635ace90fc")}</p>

      <div className="accounts-list">
        {connections.length ? (
          Object.entries(grouped).map(([type, items]) => (
            <div className="provider-group" key={type}>
              <div className="provider-group-header">
                <span className="provider-group-name">{type}</span>
                <span className="provider-group-count">{items?.length ?? 0}</span>
                <Link to="/connections/" className="btn btn-ghost btn-sm provider-add-btn">
                  {t("legacy.text_0718942b5fff")}
                </Link>
              </div>
              <div className="provider-conns">
                {items?.map((connection) => (
                  <div className="provider-conn-row" key={connection.id}>
                    <div className="provider-conn-info">
                      <span className="provider-conn-name">
                        {connection.name || connection.label || connection.id}
                      </span>
                      <span className="provider-conn-sub">
                        {(connection.tokens_in ?? 0) + (connection.tokens_out ?? 0)}{" "}
                        {t("legacy.text_3391436a4e72")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="provider-empty">
            {t("legacy.text_24b1efe1ceee")}
            <Link to="/connections/">{t("legacy.text_321fe7959b2f")}</Link>
          </div>
        )}
      </div>
    </>
  );
}
