import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { SkillCategoryGlyph, type SkillCategory } from "@/components/resource-icons";
import { FilterBar, Icon, LabelChips, LabelPicker, Modal } from "./knowledge-ui";
import { SkillBuilderDialog } from "./skill-builder-dialog";
import type {
  KnowledgeData,
  KnowledgeItem,
  KnowledgeTab,
  MemoryItem,
  ResourceGroupsResponse,
  Skill,
  SkillDraft,
  SocialResourcesResponse,
  ViewMode,
  Workspace,
} from "./types";
import "../../../assets/css/labels.css";
import "../../../assets/components/filter_agents/filter_agents.css";
import "../../../assets/components/group-panel/group-panel.css";
import "../../../assets/components/skill-card/skill-card.css";
import "../../../assets/components/dialog_skill/dialog_skill.css";
import "@/styles/routes/knowledge/knowledge.css";
import "@/styles/routes/memory/memory.css";
import "./knowledge-page.css";

function parseSkillFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  if (!text.startsWith("---")) return { meta: {}, body: text.trim() };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: text.trim() };
  const meta: Record<string, string> = {};
  text
    .slice(4, end)
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([\w-]+):\s*(.+)/);
      const [, key, value] = m ?? [];
      if (key && value) meta[key.trim()] = value.trim();
    });
  return { meta, body: text.slice(end + 4).trim() };
}

const categories: readonly SkillCategory[] = [
  "ai",
  "messaging",
  "notes",
  "productivity",
  "dev",
  "security",
  "media",
  "data",
  "company",
];
const blockedLabels = ["draft", "quarantine", "archived", "delete"];

function pageSize() {
  const stored = Number(localStorage.getItem("ga-page-size"));
  return Number.isFinite(stored) && stored > 0 ? stored : 24;
}

async function loadKnowledge(groupId: string, signal: AbortSignal): Promise<KnowledgeData> {
  const group = groupId ? `&group_id=${encodeURIComponent(groupId)}` : "";
  const safe = <T,>(promise: Promise<T>, fallback: T) => promise.catch(() => fallback);
  const [skills, publicSkills, urls, documents, memories, socialData] = await Promise.all([
    api.get<Skill[]>(`/api/skills?scope=private${group}`, signal),
    groupId ? Promise.resolve([]) : safe(api.get<Skill[]>("/api/skills?scope=public", signal), []),
    api.get<KnowledgeItem[]>(`/api/knowledge?type=url${group}`, signal),
    api.get<KnowledgeItem[]>(`/api/knowledge?type=document${group}`, signal),
    safe(api.get<MemoryItem[]>("/api/memory", signal), []),
    safe(api.get<SocialResourcesResponse>("/api/social/me/resources?type=skill", signal), {
      resources: [],
    }),
  ]);
  const socialMap = new Map(socialData.resources.map((row) => [row.resource_id, row]));
  const mergedSkills = skills.map((skill) => {
    const social = socialMap.get(skill.id);
    return social
      ? {
          ...skill,
          _social_public: Boolean(social.is_public),
          _social_category: social.category ?? "Other",
          _social_stars: social.stars_count ?? 0,
          _social_verified: Boolean(social.verified),
        }
      : skill;
  });
  return {
    skills: mergedSkills,
    publicSkills,
    urls,
    documents,
    memories,
    social: socialData.resources,
  };
}

function formatChars(value = 0) {
  return `${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value} caracteres`;
}

function sizeLabel(value?: number) {
  if (value === undefined) return "";
  return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`;
}

function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function skillDraft(skill?: Skill | null): SkillDraft {
  return {
    ...(skill?.id ? { id: skill.id } : {}),
    name: skill?.name ?? "",
    description: skill?.description ?? "",
    icon: skill?.icon ?? skill?.category ?? "general",
    category: skill?.category ?? "",
    content: skill?.content ?? skill?.body ?? "",
    labels: skill?.labels?.length ? [...skill.labels] : ["private"],
  };
}

function SkillEditor({
  source,
  onClose,
  onSaved,
}: {
  source: SkillDraft;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(source);
  const save = useMutation({
    mutationFn: () => api.post<Skill>("/api/skills/private", draft),
    onSuccess: () => onSaved(t("skills.dialog.saved")),
  });
  const field = (
    key: keyof Pick<SkillDraft, "name" | "description" | "icon" | "category" | "content">,
    value: string,
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const selectCategory = (category: SkillCategory | "") =>
    setDraft((current) => ({
      ...current,
      category,
      icon: category || "general",
    }));
  const categoryLabel = (category: SkillCategory) =>
    t(
      `skills.categories.${category === "ai" ? "ai_agents" : category === "dev" ? "dev_full" : category}`,
    );
  return (
    <Modal
      title={draft.id ? t("skills.dialog.title_edit") : t("skills.dialog.title_new")}
      width={620}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.name.trim()) save.mutate();
        }}
      >
        <div className="modal-body knowledge-modal-body">
          <div className="dsk-field">
            <label className="dsk-label" htmlFor="knowledge-skill-name">
              {t("skills.dialog.field_name")} *
            </label>
            <input
              id="knowledge-skill-name"
              className="dsk-input"
              autoFocus
              required
              value={draft.name}
              onChange={(event) => field("name", event.target.value)}
              placeholder={t("skills.dialog.placeholder_name")}
            />
          </div>
          <div className="dsk-field">
            <label className="dsk-label" htmlFor="knowledge-skill-description">
              {t("skills.dialog.field_description")}
            </label>
            <input
              id="knowledge-skill-description"
              className="dsk-input"
              value={draft.description}
              onChange={(event) => field("description", event.target.value)}
              placeholder={t("skills.dialog.placeholder_desc")}
            />
          </div>
          <fieldset className="dsk-field skill-category-field">
            <legend className="dsk-label" id="knowledge-skill-category-label">
              {t("skills.dialog.field_category")}
            </legend>
            <div
              className="skill-category-picker"
              role="radiogroup"
              aria-labelledby="knowledge-skill-category-label"
            >
              <button
                type="button"
                className={`skill-category-option${draft.category === "" ? " skill-category-option--active" : ""}`}
                role="radio"
                aria-checked={draft.category === ""}
                onClick={() => selectCategory("")}
              >
                <span className="skill-category-option-icon">
                  <SkillCategoryGlyph size={20} />
                </span>
                <span>{t("skills.dialog.no_category")}</span>
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  className={`skill-category-option${draft.category === category ? " skill-category-option--active" : ""}`}
                  role="radio"
                  aria-checked={draft.category === category}
                  onClick={() => selectCategory(category)}
                  key={category}
                >
                  <span className="skill-category-option-icon">
                    <SkillCategoryGlyph category={category} size={20} />
                  </span>
                  <span>{categoryLabel(category)}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <LabelPicker
            value={draft.labels}
            onChange={(labels) => setDraft((current) => ({ ...current, labels }))}
          />
          <div className="dsk-field">
            <label className="dsk-label" htmlFor="knowledge-skill-content">
              {t("skills.dialog.field_content")}
            </label>
            <textarea
              id="knowledge-skill-content"
              className="dsk-textarea"
              value={draft.content}
              onChange={(event) => field("content", event.target.value)}
              placeholder={t("skills.dialog.placeholder_content")}
            />
          </div>
          {save.isError && (
            <div className="form-error" role="alert">
              {save.error.message}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("actions.cancel")}
          </button>
          <button className="btn btn-primary" disabled={save.isPending || !draft.name.trim()}>
            {save.isPending ? t("actions.saving") : t("actions.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SkillView({
  skill,
  onClose,
  onSaved,
}: {
  skill: Skill;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [labels, setLabels] = useState(skill.labels?.length ? [...skill.labels] : ["private"]);
  const [published, setPublished] = useState(
    Boolean(skill._social_public || labels.includes("public")),
  );
  const [category, setCategory] = useState(skill._social_category || "Other");
  const canEdit = skill.scope !== "public" && !skill._shared;
  const save = useMutation({
    mutationFn: async () => {
      const visibilityLabels = labels.filter((label) => label !== "private" && label !== "public");
      visibilityLabels.unshift(published ? "public" : "private");
      await api.post("/api/skills/private", { ...skill, labels: visibilityLabels });
      await api.put(`/api/skills/private/${encodeURIComponent(skill.id)}/visibility`, {
        is_public: published,
        category: category || "Other",
      });
    },
    onSuccess: () => onSaved(t("social.visibility.saved")),
  });
  return (
    <Modal title={skill.name} width={600} onClose={onClose}>
      <div className="modal-body knowledge-modal-body">
        <pre className="skill-content-pre">
          {skill.content || skill.body || t("skills.no_content")}
        </pre>
        <LabelChips labels={labels} hidePrivate={false} />
        {canEdit && (
          <div className="skill-visibility-section">
            <div className="platform-section-title">{t("social.visibility.title")}</div>
            <LabelPicker
              value={labels}
              onChange={(next) => {
                setLabels(next);
                setPublished(next.includes("public"));
              }}
            />
            <label className="toggle-label">
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
              />
              <span className="toggle-track" />
              {t("social.visibility.make_public")}
            </label>
            {published && (
              <select
                className="select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {[
                  "Coding",
                  "Writing",
                  "Research",
                  "Data",
                  "DevOps",
                  "Support",
                  "Education",
                  "Productivity",
                  "Marketing",
                  "Finance",
                  "Other",
                ].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            )}
            {save.isError && (
              <div className="form-error" role="alert">
                {save.error.message}
              </div>
            )}
          </div>
        )}
      </div>
      {canEdit && (
        <div className="modal-footer">
          <button
            className="btn btn-primary"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? t("actions.saving") : t("social.visibility.save_btn")}
          </button>
        </div>
      )}
    </Modal>
  );
}

function ExportSkill({
  skill,
  onClose,
  onDone,
}: {
  skill: Skill;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { t } = useTranslation();
  const exportSkill = (format: "claude" | "github" | "openai" | "md") => {
    const slug = skill.id;
    const body = skill.content ?? skill.body ?? "";
    const today = new Date().toISOString().slice(0, 10);
    let filename = `${slug}.md`;
    let content = body;
    let mime = "text/markdown";
    if (format === "claude")
      content = `---\nid: ${slug}\nname: ${skill.name}\n${skill.description ? `description: ${skill.description}\n` : ""}${skill.icon ? `icon: ${skill.icon}\n` : ""}${skill.category ? `category: ${skill.category}\n` : ""}created_at: "${skill.created_at ?? today}"\nupdated_at: "${today}"\n---\n\n${body}`;
    else if (format === "github") {
      filename = `${slug}.instructions.md`;
      content = `# ${skill.name}${skill.description ? `\n\n> ${skill.description}` : ""}\n\n${body}`;
    } else if (format === "openai") {
      filename = `${slug}.json`;
      mime = "application/json";
      content = JSON.stringify(
        { name: skill.name, description: skill.description ?? "", instructions: body },
        null,
        2,
      );
    }
    download(filename, content, mime);
    onDone(t("skills.export.exported", { name: filename }));
  };
  const options = [
    { format: "claude", label: "claude_label", sub: "claude_sub", path: "claude_path" },
    { format: "github", label: "github_label", sub: "github_sub", path: "github_path" },
    { format: "openai", label: "openai_label", sub: "openai_sub", path: "openai_path" },
    { format: "md", label: "md_label", sub: "md_sub", path: "md_path" },
  ] as const;
  return (
    <Modal title={t("skills.export.title")} width={420} onClose={onClose}>
      <div className="modal-body">
        <p>{t("skills.export.choose_format")}</p>
        <div className="export-options">
          {options.map((option) => (
            <button
              className="export-opt"
              key={option.format}
              onClick={() => exportSkill(option.format)}
            >
              <span className="export-opt-icon">●</span>
              <span>
                <span className="export-opt-label">{t(`skills.export.${option.label}`)}</span>
                <span className="export-opt-sub">{t(`skills.export.${option.sub}`)}</span>
                <span className="export-opt-path">{t(`skills.export.${option.path}`)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function SkillCard({
  skill,
  viewMode,
  busy,
  onView,
  onEdit,
  onDelete,
  onShare,
  onExport,
  onSync,
}: {
  skill: Skill;
  viewMode: ViewMode;
  busy: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onExport: () => void;
  onSync: () => void;
}) {
  const { t } = useTranslation();
  const shared = Boolean(skill._shared),
    canEdit = !shared && skill.scope !== "public";
  const blocked = blockedLabels.some((label) => skill.labels?.includes(label));
  return (
    <article
      className={`skill-card${blocked ? " skill-card--blocked" : ""}${viewMode === "list" ? " skill-card--list" : ""}`}
      draggable={canEdit}
      onDragStart={(event) =>
        event.dataTransfer.setData("application/x-iagents-resource", skill.id)
      }
    >
      <div className="skill-card-body">
        <div className="skill-card-top">
          <div className="skill-card-icon">
            <SkillCategoryGlyph category={skill.category} size={20} />
          </div>
          <div className="skill-card-meta">
            <div className="skill-card-name-row">
              <span className="skill-card-name" title={skill.name}>
                {skill.name}
              </span>
              {shared && (
                <span className="res-badge res-badge--shared">
                  @{skill.owner_id || t("teams.sharing.shared_badge")}
                </span>
              )}
              {Boolean(skill._social_stars) && (
                <span className="skill-scope-badge skill-scope-badge--stars">
                  ★ {skill._social_stars}
                </span>
              )}
              {skill._social_verified && (
                <span className="skill-scope-badge skill-scope-badge--verified">✓ Verificado</span>
              )}
            </div>
            {skill.category && (
              <div className="skill-card-sub">
                <span className="skill-category-badge">
                  {t(`skills.categories.${skill.category}`, skill.category)}
                </span>
              </div>
            )}
          </div>
        </div>
        <p className={`skill-card-desc${skill.description ? "" : " skill-card-desc--empty"}`}>
          {skill.description || "Sin descripción"}
        </p>
        <LabelChips labels={skill.labels ?? []} hidePrivate={false} />
      </div>
      <footer className="skill-card-footer">
        <button className="skill-action-icon" onClick={onView} title="Vista previa">
          <Icon kind="view" />
        </button>
        {canEdit && (
          <button className="skill-action-icon" onClick={onEdit} title={t("skills.actions.edit")}>
            <Icon kind="edit" />
          </button>
        )}
        <div className="skill-card-actions-right">
          {canEdit && (
            <button
              className="skill-action-icon skill-action-icon--share"
              onClick={onShare}
              title={t("teams.sharing.share_with")}
            >
              <Icon kind="share" />
            </button>
          )}
          <button
            className="skill-action-icon"
            onClick={onExport}
            title={t("skills.actions.export")}
          >
            <Icon kind="export" />
          </button>
          {canEdit && skill.labels?.includes("linked") && (
            <button
              className="skill-action-icon"
              disabled={busy}
              onClick={onSync}
              title={t("labels.actions.sync")}
            >
              <Icon kind="sync" />
            </button>
          )}
          {canEdit && (
            <button
              className="skill-action-icon skill-action-icon--danger"
              disabled={busy}
              onClick={onDelete}
              title={t("skills.actions.delete")}
            >
              <Icon kind="delete" />
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

function ResourceCard({
  item,
  onDelete,
  onShare,
}: {
  item: KnowledgeItem;
  onDelete: () => void;
  onShare: () => void;
}) {
  const { t } = useTranslation();
  const document = item.type === "document";
  return (
    <article
      className="knowledge-card"
      draggable={!item._shared}
      onDragStart={(event) =>
        event.dataTransfer.setData("application/x-iagents-resource", item.id)
      }
    >
      <div className="knowledge-card-header">
        <span className="knowledge-card-icon">
          {document ? (item.source.toLowerCase().endsWith(".pdf") ? "📄" : "📝") : "🔗"}
        </span>
        <span className="knowledge-card-title" title={item.title}>
          {item.title}
        </span>
        {(item.char_count ?? 0) > 8000 && (
          <span className="knowledge-warn" title={t("skills.knowledge.char_warning")}>
            ⚠
          </span>
        )}
        {item._shared ? (
          <span className="res-badge res-badge--shared">
            @{item.owner_id || t("teams.sharing.shared_badge")}
          </span>
        ) : (
          <span className="label-chip" style={{ "--lc": "#059669" } as React.CSSProperties}>
            {t("agents.origin.owner")}
          </span>
        )}
        {!item._shared && (
          <button
            className="knowledge-action-btn knowledge-action-btn--share"
            onClick={onShare}
            title={t("teams.sharing.share_with")}
          >
            <Icon kind="share" />
          </button>
        )}
        {!item._shared && (
          <button
            className="knowledge-action-btn knowledge-action-btn--danger"
            onClick={onDelete}
            title={t("actions.delete")}
          >
            <Icon kind="delete" />
          </button>
        )}
      </div>
      {document ? (
        <div className="knowledge-card-source">{item.source}</div>
      ) : (
        <a
          className="knowledge-card-source"
          href={item.source}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.source}
        </a>
      )}
      <div className="knowledge-card-meta">{formatChars(item.char_count)}</div>
    </article>
  );
}

function MemoryCard({
  item,
  onEdit,
  onDelete,
}: {
  item: MemoryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <article
      className="mem-card"
      draggable
      onDragStart={(event) =>
        event.dataTransfer.setData("application/x-iagents-resource", item.filename)
      }
    >
      <button
        className="mem-card-body"
        onClick={onEdit}
        style={{ border: 0, background: "none", textAlign: "left" }}
      >
        <span className="mem-card-head">
          <span className="mem-card-icon">
            <Icon kind="file" />
          </span>
          <span className="mem-card-info">
            <span className="mem-card-name">{item.filename}</span>
            <span className="mem-card-sub">{sizeLabel(item.size)}</span>
          </span>
        </span>
      </button>
      <footer className="mem-card-actions">
        <button
          className="mem-action mem-action--edit"
          onClick={onEdit}
          title={t("memory.actions.edit")}
        >
          <Icon kind="edit" />
        </button>
        <button
          className="mem-action mem-action--delete"
          onClick={onDelete}
          title={t("memory.actions.delete")}
        >
          <Icon kind="delete" />
        </button>
      </footer>
    </article>
  );
}

function UrlEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(""),
    [title, setTitle] = useState("");
  const save = useMutation({
    mutationFn: () =>
      api.post<KnowledgeItem>("/api/knowledge/url", {
        url: url.trim(),
        title: title.trim() || url.trim(),
      }),
    onSuccess: (item) => onSaved(item.title),
  });
  return (
    <Modal title={t("skills.knowledge.add_url_btn")} width={520} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (url.trim()) save.mutate();
        }}
      >
        <div className="modal-body">
          <div className="field">
            <label htmlFor="knowledge-url">URL</label>
            <input
              id="knowledge-url"
              className="input"
              type="url"
              required
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t("skills.knowledge.url_placeholder")}
            />
          </div>
          <div className="field">
            <label htmlFor="knowledge-url-title">Título</label>
            <input
              id="knowledge-url-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("skills.knowledge.title_placeholder")}
            />
          </div>
          {save.isError && (
            <div className="form-error" role="alert">
              {save.error.message}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("actions.cancel")}
          </button>
          <button className="btn btn-primary" disabled={save.isPending || !url.trim()}>
            {save.isPending ? t("skills.knowledge.fetching") : t("skills.knowledge.add_url_btn")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MemoryEditor({
  source,
  onClose,
  onSaved,
}: {
  source: MemoryItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [filename, setFilename] = useState(source?.filename.replace(/\.md$/i, "") ?? ""),
    [content, setContent] = useState(source?.content ?? "");
  const save = useMutation({
    mutationFn: () => {
      const name = filename.toLowerCase().endsWith(".md") ? filename : `${filename}.md`;
      return api.post(`/api/memory/${encodeURIComponent(name)}`, { content });
    },
    onSuccess: () => onSaved(t("memory.modal.saved")),
  });
  return (
    <Modal
      title={source ? t("memory.modal.title_edit") : t("memory.modal.title_new")}
      width={660}
      className="mem-modal-box"
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (filename.trim()) save.mutate();
        }}
      >
        <div className="modal-body">
          <div className="field">
            <label htmlFor="knowledge-memory-filename">{t("memory.modal.field_name")}</label>
            <div className="mem-filename-wrap">
              <input
                id="knowledge-memory-filename"
                className="input"
                readOnly={Boolean(source)}
                required
                autoFocus={!source}
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
              />
              <span className="mem-filename-ext">.md</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="knowledge-memory-content">{t("memory.modal.field_content")}</label>
            <textarea
              id="knowledge-memory-content"
              className="textarea mem-textarea"
              autoFocus={Boolean(source)}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>
          {save.isError && (
            <div className="form-error" role="alert">
              {save.error.message}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("actions.cancel")}
          </button>
          <button className="btn btn-primary" disabled={save.isPending || !filename.trim()}>
            {save.isPending ? t("memory.modal.saving") : t("memory.modal.save_btn")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ShareDialog({
  resourceType,
  resourceId,
  resourceName,
  workspaces,
  onClose,
  onSaved,
}: {
  resourceType: "skill" | "knowledge";
  resourceId: string;
  resourceName: string;
  workspaces: Workspace[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const groups = useQuery({
    queryKey: ["knowledge", "sharing", resourceType, resourceId],
    queryFn: ({ signal }) =>
      api.get<ResourceGroupsResponse>(
        `/api/sharing/${resourceType}/${encodeURIComponent(resourceId)}/groups`,
        signal,
      ),
  });
  const save = useMutation({
    mutationFn: async () => {
      const before = new Set(groups.data?.group_ids ?? []),
        after = new Set(
          workspaces
            .filter((workspace) => changes[workspace.id] ?? before.has(workspace.id))
            .map((workspace) => workspace.id),
        );
      await Promise.all(
        workspaces
          .filter((workspace) => workspace.type === "team")
          .flatMap((workspace) => {
            if (after.has(workspace.id) && !before.has(workspace.id))
              return [
                api.post(`/api/sharing/${resourceType}/${encodeURIComponent(resourceId)}`, {
                  group_id: workspace.id,
                }),
              ];
            if (!after.has(workspace.id) && before.has(workspace.id))
              return [
                api.delete(
                  `/api/sharing/${resourceType}/${encodeURIComponent(resourceId)}?group_id=${encodeURIComponent(workspace.id)}`,
                ),
              ];
            return [];
          }),
      );
    },
    onSuccess: () => onSaved(`“${resourceName}” compartido correctamente`),
  });
  const teamGroups = workspaces.filter((workspace) => workspace.type === "team");
  return (
    <Modal title={`Compartir “${resourceName}”`} width={480} onClose={onClose}>
      <div className="modal-body">
        <p className="input-hint">Selecciona los grupos que podrán usar este recurso.</p>
        {groups.isPending ? (
          <div className="empty-state">Cargando grupos…</div>
        ) : teamGroups.length ? (
          <div className="knowledge-share-list">
            {teamGroups.map((workspace) => {
              const checked =
                changes[workspace.id] ?? groups.data?.group_ids.includes(workspace.id) ?? false;
              return (
                <label className="knowledge-share-row" key={workspace.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      setChanges((current) => ({
                        ...current,
                        [workspace.id]: event.target.checked,
                      }))
                    }
                  />
                  <span>{workspace.name}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No perteneces a ningún grupo.</div>
        )}
        {save.isError && <div className="form-error">{save.error.message}</div>}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          disabled={save.isPending || groups.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}

function Catalog({
  skills,
  onClose,
  onImport,
  onSocialAction,
}: {
  skills: Skill[];
  onClose: () => void;
  onImport: (skill: Skill) => void;
  onSocialAction: (action: "fork" | "link", skill: Skill) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const visible = skills.filter((skill) =>
    `${skill.name} ${skill.description ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Modal
      title={t("skills.catalog.open_btn")}
      width={760}
      className="knowledge-catalog-box"
      onClose={onClose}
    >
      <div className="modal-header knowledge-catalog-header">
        <input
          className="input"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("skills.catalog.search_placeholder")}
        />
      </div>
      <div className="knowledge-catalog-grid">
        {visible.length ? (
          visible.map((skill) => (
            <article className="knowledge-catalog-card" key={skill.id}>
              <h3>
                {skill.icon} {skill.name}
              </h3>
              <p>{skill.description || "Sin descripción"}</p>
              <LabelChips labels={skill.labels ?? []} />
              <div className="knowledge-skill-actions">
                <button className="btn btn-primary btn-sm" onClick={() => onImport(skill)}>
                  {t("skills.catalog.import_btn")}
                </button>
                <button
                  className="skill-action-icon"
                  onClick={() => onSocialAction("fork", skill)}
                  title={t("labels.actions.fork")}
                >
                  <Icon kind="fork" />
                </button>
                <button
                  className="skill-action-icon"
                  onClick={() => onSocialAction("link", skill)}
                  title={t("labels.actions.link")}
                >
                  <Icon kind="link" />
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="skills-empty">
            {query ? t("skills.catalog.empty_search") : t("skills.catalog.empty")}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function KnowledgePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<KnowledgeTab>("skills"),
    [view, setView] = useState<ViewMode>(() =>
      localStorage.getItem("kv-view") === "list" ? "list" : "grid",
    ),
    [groupId, setGroupId] = useState(""),
    [groupsOpen, setGroupsOpen] = useState(false);
  const [query, setQuery] = useState(""),
    [filterLabels, setFilterLabels] = useState<string[]>([]),
    [shown, setShown] = useState(pageSize());
  const [menuOpen, setMenuOpen] = useState(false),
    [status, setStatus] = useState(""),
    [statusError, setStatusError] = useState(false),
    [busy, setBusy] = useState("");
  const [skillEditor, setSkillEditor] = useState<SkillDraft | null>(null),
    [skillBuilderOpen, setSkillBuilderOpen] = useState(false),
    [skillView, setSkillView] = useState<Skill | null>(null),
    [skillExport, setSkillExport] = useState<Skill | null>(null),
    [catalogOpen, setCatalogOpen] = useState(false),
    [urlOpen, setUrlOpen] = useState(false),
    [memoryEditor, setMemoryEditor] = useState<MemoryItem | null | undefined>(undefined);
  const [share, setShare] = useState<{
      type: "skill" | "knowledge";
      id: string;
      name: string;
    } | null>(null),
    [uploadStatus, setUploadStatus] = useState("");
  const skillFile = useRef<HTMLInputElement>(null),
    docFile = useRef<HTMLInputElement>(null),
    memoryFile = useRef<HTMLInputElement>(null);
  const queryResult = useQuery({
    queryKey: ["knowledge", "overview", groupId],
    queryFn: ({ signal }) => loadKnowledge(groupId, signal),
  });
  const workspaceQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: ({ signal }) => api.get<Workspace[]>("/api/workspaces", signal),
    retry: false,
  });
  const data = queryResult.data;
  const teams = (workspaceQuery.data ?? []).filter((workspace) => workspace.type === "team");

  const done = (message: string) => {
    setStatus(message);
    setStatusError(false);
    setMenuOpen(false);
    setSkillEditor(null);
    setSkillBuilderOpen(false);
    setSkillView(null);
    setSkillExport(null);
    setCatalogOpen(false);
    setUrlOpen(false);
    setMemoryEditor(undefined);
    setShare(null);
    void queryResult.refetch();
  };
  const fail = (error: unknown) => {
    setStatus(error instanceof Error ? error.message : "No se pudo completar la acción");
    setStatusError(true);
  };
  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try {
      await action();
      done(message);
    } catch (error) {
      fail(error);
    } finally {
      setBusy("");
    }
  };

  const skills = useMemo(() => {
    const lower = query.toLowerCase();
    return (data?.skills ?? []).filter(
      (skill) =>
        (!lower || `${skill.name} ${skill.description ?? ""}`.toLowerCase().includes(lower)) &&
        (!filterLabels.length ||
          filterLabels.some((label) => (skill.labels ?? ["private"]).includes(label))),
    );
  }, [data?.skills, filterLabels, query]);
  const resources = useMemo(() => {
    const source = tab === "urls" ? (data?.urls ?? []) : (data?.documents ?? []);
    const lower = query.toLowerCase();
    return source.filter(
      (item) =>
        !lower || `${item.title} ${item.source}`.toLowerCase().includes(lower),
    );
  }, [data?.documents, data?.urls, query, tab]);
  const memories = useMemo(() => {
    const lower = query.toLowerCase();
    return (data?.memories ?? []).filter(
      (item) =>
        !lower || item.filename.toLowerCase().includes(lower),
    );
  }, [data?.memories, query]);

  const selectTab = (next: KnowledgeTab) => {
    setTab(next);
    setQuery("");
    setFilterLabels([]);
    setShown(pageSize());
    setMenuOpen(false);
  };
  const selectView = (next: ViewMode) => {
    setView(next);
    localStorage.setItem("kv-view", next);
  };
  const loadSkillFor = (skill: Skill, action: "view" | "edit" | "export") => {
    setBusy(`load:${skill.id}`);
    api
      .get<Skill>(`/api/skills/${skill.scope ?? "private"}/${encodeURIComponent(skill.id)}`)
      .then((full) => {
        if (action === "view") setSkillView({ ...full, ...skill });
        else if (action === "export") setSkillExport({ ...full, ...skill });
        else setSkillEditor(skillDraft({ ...full, ...skill }));
      })
      .catch(fail)
      .finally(() => setBusy(""));
  };

  const importSkillFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    file
      .text()
      .then((text) => {
        const { meta, body } = parseSkillFrontmatter(text);
        const name = meta.name || file.name.replace(/\.md$/i, "");
        if (!name) throw new Error("Missing required field: name");
        setSkillEditor(
          skillDraft({
            id: "",
            name,
            description: meta.description ?? "",
            icon: meta.icon ?? "",
            category: meta.category ?? "",
            content: body,
          }),
        );
      })
      .catch(fail);
  };
  const importMemoryFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    file
      .text()
      .then((text) => {
        if (file.name.toLowerCase().endsWith(".json")) {
          const parsed = JSON.parse(text) as { filename?: string; content?: string };
          setMemoryEditor({
            filename: parsed.filename || file.name.replace(/\.json$/i, ""),
            content: parsed.content ?? "",
          });
        } else setMemoryEditor({ filename: file.name.replace(/\.[^.]+$/, ""), content: text });
      })
      .catch(fail);
  };
  const uploadDocuments = async (files: File[]) => {
    const allowed = files.filter((file) => /\.(txt|md|pdf)$/i.test(file.name));
    if (!allowed.length) {
      fail(new Error(t("skills.knowledge.formats_hint")));
      return;
    }
    setUploadStatus(`0 / ${allowed.length}`);
    let completed = 0;
    for (const file of allowed) {
      const form = new FormData();
      form.append("file", file);
      try {
        await api.upload("/api/knowledge/document", form);
        completed++;
      } catch (error) {
        fail(error);
      }
      setUploadStatus(`${completed} / ${allowed.length}`);
    }
    setUploadStatus("");
    if (completed)
      done(
        `${completed} documento${completed === 1 ? "" : "s"} subido${completed === 1 ? "" : "s"}`,
      );
  };
  const dropDocs = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void uploadDocuments([...event.dataTransfer.files]);
  };

  const actionButton = (
    <div className="page-actions knowledge-header-actions">
      <button
        className="btn btn-primary"
        onClick={() => {
          if (tab === "urls") setUrlOpen(true);
          else if (tab === "documents") docFile.current?.click();
          else setMenuOpen((value) => !value);
        }}
      >
        {tab === "documents" ? <Icon kind="upload" /> : <Icon kind="plus" />}
        <span>
          {tab === "skills"
            ? t("skills.page.new_btn")
            : tab === "urls"
              ? t("skills.knowledge.add_url_btn")
              : tab === "documents"
                ? t("skills.knowledge.upload_btn")
                : t("memory.page.new_btn")}
        </span>
        {(tab === "skills" || tab === "memory") && <span>⌄</span>}
      </button>
      {menuOpen && (
        <div className="knowledge-create-menu">
          {tab === "skills" ? (
            <>
              <CreateOption
                icon="plus"
                title="Crear nueva"
                subtitle="Configurar la skill manualmente"
                onClick={() => {
                  setMenuOpen(false);
                  setSkillEditor(skillDraft());
                }}
              />
              <CreateOption
                icon="catalog"
                title="Crear con Asistente"
                subtitle="Describe una capacidad y deja que la IA prepare el borrador"
                onClick={() => {
                  setMenuOpen(false);
                  setSkillBuilderOpen(true);
                }}
              />
              <CreateOption
                icon="catalog"
                title={t("skills.page.new_from_catalog")}
                subtitle={t("skills.page.new_from_catalog_sub")}
                onClick={() => {
                  setMenuOpen(false);
                  setCatalogOpen(true);
                }}
              />
              <CreateOption
                icon="upload"
                title={t("skills.page.new_from_file")}
                subtitle={t("skills.page.new_from_file_sub")}
                onClick={() => skillFile.current?.click()}
              />
            </>
          ) : (
            <>
              <CreateOption
                icon="upload"
                title={t("memory.page.new_from_file")}
                subtitle={t("memory.page.new_from_file_sub")}
                onClick={() => memoryFile.current?.click()}
              />
              <CreateOption
                icon="plus"
                title={t("memory.page.new_from_scratch")}
                subtitle={t("memory.page.new_from_scratch_sub")}
                onClick={() => setMemoryEditor(null)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <main className="page-content knowledge-page">
      <div className="page-header">
        <h1 className="page-title">{t("skills.knowledge.page_title")}</h1>
        {actionButton}
      </div>
      <input
        ref={skillFile}
        type="file"
        accept=".md"
        hidden
        onChange={importSkillFile}
      />
      <input
        ref={docFile}
        type="file"
        accept=".txt,.md,.pdf"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          void uploadDocuments(files);
        }}
      />
      <input ref={memoryFile} type="file" accept=".md,.json" hidden onChange={importMemoryFile} />
      <div className="knowledge-tabs">
        <button
          className={`ktab${tab === "skills" ? " active" : ""}`}
          onClick={() => selectTab("skills")}
        >
          {t("skills.knowledge.tab_skills")}
        </button>
        <button
          className={`ktab${tab === "urls" ? " active" : ""}`}
          onClick={() => selectTab("urls")}
        >
          {t("skills.knowledge.tab_urls")}
        </button>
        <button
          className={`ktab${tab === "documents" ? " active" : ""}`}
          onClick={() => selectTab("documents")}
        >
          {t("skills.knowledge.tab_documents")}
        </button>
        <button
          className={`ktab${tab === "memory" ? " active" : ""}`}
          onClick={() => selectTab("memory")}
        >
          {t("memory.page.title")}
        </button>
        <div className="kv-view-controls">
          <button
            className={`kv-toggle${view === "grid" ? " kv-toggle--active" : ""}`}
            onClick={() => selectView("grid")}
            title="Vista cuadrícula"
          >
            <Icon kind="grid" />
          </button>
          <button
            className={`kv-toggle${view === "list" ? " kv-toggle--active" : ""}`}
            onClick={() => selectView("list")}
            title="Vista lista"
          >
            <Icon kind="list" />
          </button>
        </div>
      </div>
      <div
        className={`knowledge-status${statusError ? " knowledge-status--error" : ""}`}
        role="status"
      >
        {status}
      </div>
      <FilterBar
        query={query}
        onQuery={(value) => {
          setQuery(value);
          setShown(pageSize());
        }}
        labels={filterLabels}
        onLabels={(value) => {
          setFilterLabels(value);
          setShown(pageSize());
        }}
        showLabels={tab === "skills"}
      />
      <div className="folder-toggle-row">
        <button
          className={`folder-toggle-btn kg-toggle-btn${groupsOpen ? " folder-toggle-btn--on" : ""}`}
          onClick={() => setGroupsOpen((value) => !value)}
          title={groupsOpen ? "Ocultar grupos" : "Grupos de trabajo"}
        >
          <Icon kind="groups" />
        </button>
      </div>
      <div className="knowledge-tab-layout">
        <aside className={`kf-panel${groupsOpen ? "" : " folder-panel--collapsed"}`}>
          <div className="kf-section-header">
            <span className="kf-section-label">Grupos</span>
          </div>
          <button
            className={`kf-item${!groupId ? " kf-item--active" : ""}`}
            onClick={() => {
              setGroupId("");
              setShown(pageSize());
            }}
          >
            <span className="kf-item-name">Todos</span>
          </button>
          {teams.map((team) => (
            <button
              className={`kf-item${groupId === team.id ? " kf-item--active" : ""}`}
              onClick={() => {
                setGroupId(team.id);
                setShown(pageSize());
              }}
              key={team.id}
            >
              <span className="kf-item-name">{team.name}</span>
            </button>
          ))}
          {!teams.length && <p className="gp-empty">Sin grupos</p>}
        </aside>
        <div className="knowledge-tab-content">
          {queryResult.isPending ? (
            <div className="empty-state">Cargando conocimiento…</div>
          ) : queryResult.isError ? (
            <div className="empty-state">
              <p>{queryResult.error.message}</p>
              <button className="btn btn-primary" onClick={() => void queryResult.refetch()}>
                Reintentar
              </button>
            </div>
          ) : tab === "skills" ? (
            <>
              <div className={`skills-grid${view === "list" ? " skills-grid--list" : ""}`}>
                {skills.slice(0, shown).map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    viewMode={view}
                    busy={busy.includes(skill.id)}
                    onView={() => loadSkillFor(skill, "view")}
                    onEdit={() => loadSkillFor(skill, "edit")}
                    onDelete={() => {
                      if (confirm(t("skills.confirm_delete")))
                        void run(
                          `delete:${skill.id}`,
                          () => api.delete(`/api/skills/private/${encodeURIComponent(skill.id)}`),
                          t("skills.deleted"),
                        );
                    }}
                    onShare={() => setShare({ type: "skill", id: skill.id, name: skill.name })}
                    onExport={() => loadSkillFor(skill, "export")}
                    onSync={() =>
                      void run(
                        `sync:${skill.id}`,
                        () =>
                          api.post(`/api/skills/private/${encodeURIComponent(skill.id)}/sync`, {}),
                        t("labels.actions.sync_success"),
                      )
                    }
                  />
                ))}
              </div>
              {!skills.length && <p className="skills-empty">{t("skills.empty.no_match")}</p>}
              <LoadMore
                total={skills.length}
                shown={shown}
                onMore={() => setShown((value) => value + pageSize())}
              />
            </>
          ) : tab === "urls" || tab === "documents" ? (
            <>
              {tab === "documents" && (
                <div
                  className="knowledge-dropzone"
                  onClick={() => docFile.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={dropDocs}
                >
                  <Icon kind="upload" />
                  <p>{t("skills.knowledge.drop_hint")}</p>
                  <p className="knowledge-formats">{t("skills.knowledge.formats_hint")}</p>
                </div>
              )}
              <div className={`knowledge-grid${view === "list" ? " knowledge-grid--list" : ""}`}>
                {resources.slice(0, shown).map((item) => (
                  <ResourceCard
                    item={item}
                    key={item.id}
                    onShare={() => setShare({ type: "knowledge", id: item.id, name: item.title })}
                    onDelete={() => {
                      if (confirm(t("skills.knowledge.confirm_delete")))
                        void run(
                          `delete:${item.id}`,
                          () => api.delete(`/api/knowledge/${encodeURIComponent(item.id)}`),
                          t("skills.knowledge.deleted"),
                        );
                    }}
                  />
                ))}
              </div>
              {!resources.length && (
                <p className="knowledge-empty">
                  {t(
                    tab === "urls" ? "skills.knowledge.empty_urls" : "skills.knowledge.empty_docs",
                  )}
                </p>
              )}
              <LoadMore
                total={resources.length}
                shown={shown}
                onMore={() => setShown((value) => value + pageSize())}
              />
            </>
          ) : (
            <>
              <div className="memory-grid">
                {memories.slice(0, shown).map((memory) => (
                  <MemoryCard
                    item={memory}
                    key={memory.filename}
                    onEdit={() => {
                      api
                        .get<MemoryItem>(`/api/memory/${encodeURIComponent(memory.filename)}`)
                        .then(setMemoryEditor)
                        .catch(fail);
                    }}
                    onDelete={() => {
                      if (confirm(t("memory.confirm_delete", { file: memory.filename })))
                        void run(
                          `delete:${memory.filename}`,
                          () => api.delete(`/api/memory/${encodeURIComponent(memory.filename)}`),
                          t("memory.deleted"),
                        );
                    }}
                  />
                ))}
              </div>
              {!memories.length && <div className="mem-empty">{t("memory.empty")}</div>}
              <LoadMore
                total={memories.length}
                shown={shown}
                onMore={() => setShown((value) => value + pageSize())}
              />
            </>
          )}
        </div>
      </div>
      {uploadStatus && (
        <div className="knowledge-upload-summary">Subiendo documentos… {uploadStatus}</div>
      )}
      {skillEditor && (
        <SkillEditor source={skillEditor} onClose={() => setSkillEditor(null)} onSaved={done} />
      )}{" "}
      {skillBuilderOpen && (
        <SkillBuilderDialog
          onClose={() => setSkillBuilderOpen(false)}
          onReady={(draft) => {
            setSkillBuilderOpen(false);
            setSkillEditor(draft);
          }}
        />
      )}{" "}
      {skillView && (
        <SkillView skill={skillView} onClose={() => setSkillView(null)} onSaved={done} />
      )}{" "}
      {skillExport && (
        <ExportSkill skill={skillExport} onClose={() => setSkillExport(null)} onDone={done} />
      )}{" "}
      {catalogOpen && (
        <Catalog
          skills={data?.publicSkills ?? []}
          onClose={() => setCatalogOpen(false)}
          onImport={(skill) => {
            setCatalogOpen(false);
            setSkillEditor(skillDraft({ ...skill, id: "", scope: "private", labels: ["private"] }));
          }}
          onSocialAction={(action, skill) =>
            void run(
              `${action}:${skill.id}`,
              () => api.post(`/api/skills/public/${encodeURIComponent(skill.id)}/${action}`, {}),
              action === "fork"
                ? t("labels.actions.fork_success")
                : t("labels.actions.link_success"),
            )
          }
        />
      )}{" "}
      {urlOpen && <UrlEditor onClose={() => setUrlOpen(false)} onSaved={done} />}{" "}
      {memoryEditor !== undefined && (
        <MemoryEditor
          source={memoryEditor}
          onClose={() => setMemoryEditor(undefined)}
          onSaved={done}
        />
      )}{" "}
      {share && (
        <ShareDialog
          resourceType={share.type}
          resourceId={share.id}
          resourceName={share.name}
          workspaces={workspaceQuery.data ?? []}
          onClose={() => setShare(null)}
          onSaved={done}
        />
      )}
    </main>
  );
}

function CreateOption({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: "catalog" | "upload" | "plus";
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      className="knowledge-create-option"
      onClick={() => {
        onClick();
      }}
    >
      <span className="knowledge-create-option-icon">
        <Icon kind={icon} />
      </span>
      <span className="knowledge-create-option-copy">
        {title}
        <small>{subtitle}</small>
      </span>
    </button>
  );
}
function LoadMore({ total, shown, onMore }: { total: number; shown: number; onMore: () => void }) {
  if (shown >= total) return null;
  return (
    <div className="load-more-row">
      <button className="btn btn-ghost" onClick={onMore}>
        Cargar más
      </button>
    </div>
  );
}
