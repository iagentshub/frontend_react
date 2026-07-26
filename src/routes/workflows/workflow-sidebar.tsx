import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Workflow, WorkflowWorkspace } from "./types";

export function WorkflowCatalog({
  workflows,
  pending,
  error,
  onSelect,
  onCreate,
  onShare,
  workspaces,
}: {
  workflows: Workflow[];
  pending: boolean;
  error: boolean;
  onSelect: (workflow: Workflow) => void;
  onCreate: () => void;
  onShare: (workflow: Workflow) => void;
  workspaces: WorkflowWorkspace[];
}) {
  const { t, i18n } = useTranslation("workflows");
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groupsOpen, setGroupsOpen] = useState(true);
  const teamGroups = workspaces.filter((workspace) => workspace.type === "team");
  const filteredWorkflows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(i18n.resolvedLanguage);
    return workflows.filter(
      (workflow) =>
        (!groupId ||
          workflow._group_id === groupId ||
          workflow._group_ids?.includes(groupId) ||
          (!workflow._shared && workflow.owner_id === groupId)) &&
        (!normalizedQuery ||
          `${workflow.name} ${workflow.description}`
            .toLocaleLowerCase("es")
            .includes(normalizedQuery)),
    );
  }, [groupId, i18n.resolvedLanguage, query, workflows]);
  const formatUpdatedAt = (value?: string) => {
    if (!value) return t("catalog.never_run");
    const date = new Intl.DateTimeFormat(i18n.resolvedLanguage === "en" ? "en" : "es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
    return t("catalog.updated", { date });
  };

  return (
    <section className="workflow-catalog">
      <div className="folder-toggle-row">
        <button
          className={`folder-toggle-btn${groupsOpen ? " folder-toggle-btn--on" : ""}`}
          type="button"
          onClick={() => setGroupsOpen((value) => !value)}
          title={t(groupsOpen ? "common.workspace.hide_groups" : "common.workspace.groups")}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M1.5 13v-.5A3.5 3.5 0 0 1 5 9a3.5 3.5 0 0 1 3.5 3.5V13"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M9 9.2A3.5 3.5 0 0 1 14.5 12.5V13"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="workflow-catalog-layout">
        <aside
          className={`workflow-groups kf-panel${groupsOpen ? "" : " folder-panel--collapsed"}`}
          aria-label={t("groups.aria")}
        >
          <div className="kf-section-header">
            <span className="kf-section-label">{t("groups.title")}</span>

            <Link
              className="kf-add-btn"
              to="/profile/?tab=workspaces"
              title={t("groups.manage")}
              aria-label={t("groups.manage")}
            >
              ＋
            </Link>
          </div>

          <button
            className={`kf-item${!groupId ? " kf-item--active" : ""}`}
            type="button"
            onClick={() => setGroupId("")}
          >
            <span className="kf-item-name">{t("groups.all")}</span>
          </button>

          {teamGroups.map((group) => (
            <button
              className={`kf-item${groupId === group.id ? " kf-item--active" : ""}`}
              type="button"
              key={group.id}
              onClick={() => setGroupId(group.id)}
            >
              <span className="kf-item-name">{group.name}</span>
            </button>
          ))}

          {!teamGroups.length && <p className="gp-empty">{t("groups.empty")}</p>}
        </aside>

        <div className="workflow-catalog-content">
          <div className="workflow-catalog-toolbar">
            <label className="workflow-search">
              <span aria-hidden="true">⌕</span>

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("catalog.search")}
                aria-label={t("catalog.search")}
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("catalog.clear_search")}
                >
                  ×
                </button>
              )}
            </label>

            <span className="workflow-catalog-count">
              {t(filteredWorkflows.length === 1 ? "catalog.count_one" : "catalog.count_many", {
                count: filteredWorkflows.length,
              })}
            </span>
          </div>

          {pending && <div className="workflow-catalog-state">{t("catalog.loading")}</div>}

          {error && (
            <div className="workflow-catalog-state form-error">{t("catalog.load_error")}</div>
          )}

          {!pending && !error && filteredWorkflows.length > 0 && (
            <div className="workflow-catalog-grid">
              {filteredWorkflows.map((workflow, workflowIndex) => {
                const nodes = workflow.definition.nodes;
                const configured = nodes.filter((node) => node.instruction?.trim()).length;
                return (
                  <article className="workflow-catalog-card" key={workflow.id}>
                    <button
                      className="workflow-card-main"
                      type="button"
                      onClick={() => onSelect(workflow)}
                      aria-label={t("catalog.open")}
                    >
                      <div className="workflow-card-top">
                        <div className="workflow-card-identity">
                          <div className="workflow-card-glyph" aria-hidden="true">
                            <i />

                            <i />

                            <i />
                          </div>

                          <span>
                            {t("catalog.pipeline", {
                              number: String(workflowIndex + 1).padStart(2, "0"),
                            })}
                          </span>
                        </div>

                        <span className={`workflow-card-status${nodes.length ? "" : " is-draft"}`}>
                          <i aria-hidden="true" />
                          {workflow._shared
                            ? t("catalog.shared")
                            : nodes.length
                              ? t("catalog.operational")
                              : t("catalog.draft")}
                        </span>
                      </div>

                      <div className="workflow-card-copy">
                        <h2>{workflow.name}</h2>

                        <p>{workflow.description || t("catalog.fallback_description")}</p>
                      </div>

                      <div className="workflow-card-flow" aria-hidden="true">
                        <span className="workflow-card-endpoint">
                          {t("legacy.text_6fca55ca3c82")}
                        </span>

                        {nodes.slice(0, 4).map((node, index) => (
                          <span key={node.id}>
                            <i className="workflow-card-connector" />

                            <b title={node.label}>
                              {(node.label || "A").charAt(0).toUpperCase()}

                              <em>{index + 1}</em>
                            </b>
                          </span>
                        ))}

                        {nodes.length > 4 && (
                          <small className="workflow-card-more">+{nodes.length - 4}</small>
                        )}

                        {!nodes.length && <small>{t("catalog.empty_pipeline")}</small>}

                        {nodes.length > 0 && (
                          <>
                            <i className="workflow-card-connector" />

                            <span className="workflow-card-endpoint output">
                              {t("legacy.text_5d84eb9e92dc")}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="workflow-card-metrics">
                        <span>
                          <small>{t("catalog.agents")}</small>

                          <strong>{String(nodes.length).padStart(2, "0")}</strong>
                        </span>

                        <span>
                          <small>{t("catalog.links")}</small>

                          <strong>{String(Math.max(0, nodes.length - 1)).padStart(2, "0")}</strong>
                        </span>

                        <span>
                          <small>{t("catalog.configured")}</small>

                          <strong>{String(configured).padStart(2, "0")}</strong>
                        </span>
                      </div>
                    </button>

                    <footer>
                      <span>{formatUpdatedAt(workflow.updated_at)}</span>

                      <div>
                        {!workflow._shared && (
                          <button
                            className="workflow-card-share"
                            type="button"
                            onClick={() => onShare(workflow)}
                          >
                            {t("catalog.share")}
                          </button>
                        )}

                        <button type="button" onClick={() => onSelect(workflow)}>
                          {t("catalog.open")}
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}

          {!pending && !error && query && !filteredWorkflows.length && (
            <div className="workflow-catalog-state">
              <span>⌕</span>

              <strong>{t("catalog.no_matches")}</strong>

              <p>{t("catalog.no_matches_description", { query })}</p>

              <button className="btn btn-ghost" type="button" onClick={() => setQuery("")}>
                {t("catalog.clear_search")}
              </button>
            </div>
          )}

          {!pending && !error && !query && groupId && !filteredWorkflows.length && (
            <div className="workflow-catalog-state">
              <span>⌁</span>

              <strong>{t("catalog.group_empty")}</strong>

              <p>{t("catalog.group_empty_description")}</p>
            </div>
          )}

          {!pending && !error && !query && !groupId && !workflows.length && (
            <div className="workflow-catalog-state">
              <span>⌁</span>

              <strong>{t("catalog.empty")}</strong>

              <p>{t("catalog.empty_description")}</p>

              <button className="btn btn-primary" type="button" onClick={onCreate}>
                <span aria-hidden="true">＋</span>
                {t("page.new")}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
