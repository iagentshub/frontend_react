import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { queryClient, queryKeys } from "@/api/query-client";
import type { MemoryDraft, MemoryFile, MemoryFileSummary } from "./types";
import "../../../assets/components/filter_memory/filter_memory.css";
import "../../../assets/components/action-menu/action-menu.css";
import "@/styles/routes/memory/memory.css";
import "./memory-page.css";

type Notice = { kind: "ok" | "error"; text: string } | null;

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="m11 2 3 3-9 9H2v-3l9-9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M6.5 8.5V1M3 4l3.5-3L10 4M1 10.5v1a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Modal({
  children,
  onClose,
  labelledBy,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
}) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose]);
  return (
    <div
      className="modal-bg"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal-box mem-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}

function stripMarkdownExtension(filename: string): string {
  return filename.replace(/\.md$/i, "");
}

function normalizeFilename(filename: string): string {
  const value = stripMarkdownExtension(filename.trim());
  return `${value}.md`;
}

function parseMemoryFile(filename: string, text: string): MemoryDraft {
  if (filename.toLocaleLowerCase().endsWith(".json")) {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("El JSON debe contener un objeto");
    const record = parsed as Record<string, unknown>;
    const parsedFilename =
      typeof record.filename === "string" ? record.filename : filename.replace(/\.json$/i, "");
    const content = typeof record.content === "string" ? record.content : "";
    return { filename: stripMarkdownExtension(parsedFilename), content };
  }
  return { filename: stripMarkdownExtension(filename.replace(/\.[^.]+$/, "")), content: text };
}

function displaySize(size: number | null | undefined): string {
  if (size === null || size === undefined) return "";
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function displayDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat(document.documentElement.lang || "es", {
    dateStyle: "short",
  }).format(date);
}

function MemoryEditor({
  draft,
  onClose,
  onSaved,
}: {
  draft: MemoryDraft;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const { t } = useTranslation(["memory", "common"]);
  const editing = Boolean(draft.originalFilename);
  const [filename, setFilename] = useState(stripMarkdownExtension(draft.filename));
  const [content, setContent] = useState(draft.content);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    (editing ? contentRef.current : inputRef.current)?.focus();
  }, [editing]);
  const validName = editing || /^[\p{L}\p{N}_-]+$/u.test(filename.trim());
  const save = useMutation({
    mutationFn: () => {
      const target = draft.originalFilename ?? normalizeFilename(filename);
      return api.post<MemoryFileSummary>(`/api/memory/${encodeURIComponent(target)}`, { content });
    },
    onSuccess: () => onSaved(t("memory:modal.saved")),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (validName && !save.isPending) save.mutate();
  };
  return (
    <Modal onClose={onClose} labelledBy="memory-modal-title-react">
      <form onSubmit={submit}>
        <div className="modal-header">
          <span className="modal-title" id="memory-modal-title-react">
            {editing ? t("memory:modal.title_edit") : t("memory:modal.title_new")}
          </span>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label={t("common:actions.close", "Cerrar")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="m2 2 12 12M14 2 2 14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {save.isError && (
            <div className="form-error memory-modal-error" role="alert">
              {save.error.message}
            </div>
          )}
          <div className="field">
            <label htmlFor="memory-filename-react">{t("memory:modal.field_name")}</label>
            <div className="mem-filename-wrap">
              <input
                ref={inputRef}
                id="memory-filename-react"
                className="input"
                value={filename}
                readOnly={editing}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="mi-agente"
                autoComplete="off"
                required
              />
              <span className="mem-filename-ext">.md</span>
            </div>
            {!editing && (
              <span className={`input-hint${filename && !validName ? " form-error" : ""}`}>
                {filename && !validName ? (
                  "Usa solo letras, números, guiones y guiones bajos."
                ) : (
                  <>
                    Se guardará como <code>{filename || "nombre"}.md</code>
                  </>
                )}
              </span>
            )}
          </div>
          <div className="field">
            <label htmlFor="memory-content-react">
              {t("memory:modal.field_content")} (Markdown)
            </label>
            <textarea
              ref={contentRef}
              id="memory-content-react"
              className="textarea mem-textarea"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="# Contexto del agente&#10;&#10;Escribe aquí el contexto…"
              spellCheck
            />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("common:actions.cancel", "Cancelar")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!validName || save.isPending}>
            {save.isPending ? t("memory:modal.saving") : t("memory:modal.save_btn")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MemoryCard({
  memory,
  onEdit,
  onDelete,
}: {
  memory: MemoryFileSummary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("memory");
  return (
    <article className="mem-card" data-file={memory.filename}>
      <button
        className="mem-card-body"
        type="button"
        onClick={onEdit}
        aria-label={`${t("actions.edit")} ${memory.filename}`}
      >
        <div className="mem-card-head">
          <div className="mem-card-icon">
            <FileIcon />
          </div>
          <div className="mem-card-info">
            <div className="mem-card-name" title={memory.filename}>
              {memory.filename}
            </div>
            {displaySize(memory.size) && (
              <div className="mem-card-sub">{displaySize(memory.size)}</div>
            )}
          </div>
        </div>
      </button>
      <footer className="mem-card-actions">
        <button
          className="mem-action mem-action--edit"
          type="button"
          onClick={onEdit}
          title={t("actions.edit")}
          aria-label={`${t("actions.edit")} ${memory.filename}`}
        >
          <EditIcon />
        </button>
        <button
          className="mem-action mem-action--delete"
          type="button"
          onClick={onDelete}
          title={t("actions.delete")}
          aria-label={`${t("actions.delete")} ${memory.filename}`}
        >
          <TrashIcon />
        </button>
        {displayDate(memory.updated_at) && (
          <time className="mem-card-updated" dateTime={memory.updated_at ?? undefined}>
            {displayDate(memory.updated_at)}
          </time>
        )}
      </footer>
    </article>
  );
}

export function MemoryPage() {
  const { t } = useTranslation("memory");
  const [queryText, setQueryText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editor, setEditor] = useState<MemoryDraft | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const menuWrap = useRef<HTMLDivElement>(null);
  const memories = useQuery({
    queryKey: queryKeys.memory(),
    queryFn: ({ signal }) => api.get<MemoryFileSummary[]>("/api/memory", signal),
  });
  const filtered = useMemo(() => {
    const search = queryText.trim().toLocaleLowerCase();
    return (memories.data ?? []).filter(
      (memory) => !search || memory.filename.toLocaleLowerCase().includes(search),
    );
  }, [memories.data, queryText]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuWrap.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  const remove = useMutation({
    mutationFn: (filename: string) => api.delete(`/api/memory/${encodeURIComponent(filename)}`),
    onSuccess: async () => {
      setNotice({ kind: "ok", text: t("deleted") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.memory() });
    },
    onError: (error) => setNotice({ kind: "error", text: error.message }),
  });

  const edit = async (summary: MemoryFileSummary) => {
    setNotice(null);
    try {
      const memory = await api.get<MemoryFile>(
        `/api/memory/${encodeURIComponent(summary.filename)}`,
      );
      setEditor({
        filename: stripMarkdownExtension(summary.filename),
        content: memory.content ?? "",
        originalFilename: summary.filename,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "No se pudo cargar la memoria",
      });
    }
  };

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setEditor(
          parseMemoryFile(file.name, typeof reader.result === "string" ? reader.result : ""),
        );
      } catch (error) {
        setNotice({
          kind: "error",
          text: t("page.load_error", {
            msg: error instanceof Error ? error.message : "Formato no válido",
          }),
        });
      }
    };
    reader.onerror = () =>
      setNotice({
        kind: "error",
        text: t("page.load_error", { msg: "No se pudo leer el fichero" }),
      });
    reader.readAsText(file);
    setMenuOpen(false);
  };

  const saved = async (text: string) => {
    setEditor(null);
    setNotice({ kind: "ok", text });
    await queryClient.invalidateQueries({ queryKey: queryKeys.memory() });
  };

  return (
    <main className="page-content memory-react">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("page.title")}</h1>
          <p className="page-subtitle">{t("page.subtitle")}</p>
        </div>
        <div className="page-actions">
          <div className="memory-new-wrap" ref={menuWrap}>
            <button
              className="btn btn-primary"
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <PlusIcon />
              <span>{t("page.new_btn")}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path
                  d="m2 3.5 3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {menuOpen && (
              <div className="memory-action-menu" role="menu">
                <button
                  className="memory-menu-item"
                  role="menuitem"
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  <span className="memory-menu-icon">
                    <UploadIcon />
                  </span>
                  <span className="memory-menu-label">{t("page.new_from_file")}</span>
                  <span className="memory-menu-sub">{t("page.new_from_file_sub")}</span>
                </button>
                <button
                  className="memory-menu-item"
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setEditor({ filename: "", content: "" });
                    setMenuOpen(false);
                  }}
                >
                  <span className="memory-menu-icon">
                    <PlusIcon />
                  </span>
                  <span className="memory-menu-label">{t("page.new_from_scratch")}</span>
                  <span className="memory-menu-sub">{t("page.new_from_scratch_sub")}</span>
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".md,.json,text/markdown,application/json"
            hidden
            onChange={importFile}
          />
        </div>
      </div>
      {notice && (
        <div
          className={`memory-notice${notice.kind === "error" ? " memory-notice--error" : ""}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}
      <div className="fmem-bar">
        <div className="fmem-search-wrap">
          <SearchIcon />
          <input
            className="fmem-search-input"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder={t("filter.search_placeholder")}
            aria-label={t("filter.search_placeholder")}
          />
          {queryText && (
            <button
              className="fmem-search-clear"
              type="button"
              onClick={() => setQueryText("")}
              aria-label={t("search.clear_aria")}
            >
              ×
            </button>
          )}
        </div>
      </div>
      {memories.isPending ? (
        <div className="mem-empty">Cargando memorias…</div>
      ) : memories.isError ? (
        <div className="mem-empty">
          <p>No se pudieron cargar las memorias.</p>
          <button className="btn btn-primary" onClick={() => void memories.refetch()}>
            Reintentar
          </button>
        </div>
      ) : filtered.length ? (
        <div className="memory-grid">
          {filtered.map((memory) => (
            <MemoryCard
              key={memory.filename}
              memory={memory}
              onEdit={() => void edit(memory)}
              onDelete={() => {
                if (window.confirm(t("confirm_delete", { file: memory.filename })))
                  remove.mutate(memory.filename);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="memory-grid">
          <div className="mem-empty">{t("empty")}</div>
        </div>
      )}
      {editor && (
        <MemoryEditor
          draft={editor}
          onClose={() => setEditor(null)}
          onSaved={(text) => void saved(text)}
        />
      )}
    </main>
  );
}

