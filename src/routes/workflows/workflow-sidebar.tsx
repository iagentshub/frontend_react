import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LabelChips } from "@/components/label-chips";
import "../../../assets/components/agent-card/agent-card.css";
import "../../../assets/css/labels.css";
import type { Workflow, WorkflowWorkspace } from "./types";

function WorkflowActionIcon({ kind }: { kind: "view" | "edit" | "share" | "delete" }) {
  if (kind === "view")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"
          stroke="currentColor"
          strokeWidth="1.4"
        />

        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  if (kind === "edit")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M10.8 2.2l3 3L5 14H2v-3z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "share")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="m10.5 3.8-5 3.4m5 5-5-3.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
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

export function WorkflowCatalog({
  workflows,
  pending,
  error,
  onSelect,
  onView,
  onCreate,
  onShare,
  onDelete,
  workspaces,
}: {
  workflows: Workflow[];
  pending: boolean;
  error: boolean;
  onSelect: (workflow: Workflow) => void;
  onView: (workflow: Workflow) => void;
  onCreate: () => void;
  onShare: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
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
              {filteredWorkflows.map((workflow) => {
                return (
                  <article className="workflow-catalog-card" key={workflow.id}>
                    <button
                      className="workflow-card-main"
                      type="button"
                      onClick={() => onView(workflow)}
                      aria-label={t("catalog.open")}
                    >
                      <div className="workflow-card-top">
                        <div className="workflow-card-identity">
                          <div className="workflow-card-glyph" aria-hidden="true">
                            <i />

                            <i />

                            <i />
                          </div>
                        </div>
                      </div>

                      <div className="workflow-card-copy">
                        <h2>{workflow.name}</h2>

                        <p>{workflow.description || t("catalog.fallback_description")}</p>

                        <LabelChips labels={workflow.labels} hidePrivate={false} />
                      </div>
                    </button>

                    <footer>
                      <div className="agent-card-actions-right">
                        <button
                          type="button"
                          className="agent-action-icon"
                          title={t("catalog.open")}
                          onClick={() => onView(workflow)}
                        >
                          <WorkflowActionIcon kind="view" />
                        </button>

                        <button
                          type="button"
                          className="agent-action-icon"
                          title={t("catalog.edit")}
                          onClick={() => onSelect(workflow)}
                        >
                          <WorkflowActionIcon kind="edit" />
                        </button>

                        {!workflow._shared && (
                          <>
                            <button
                              type="button"
                              className="agent-action-icon"
                              title={t("catalog.share")}
                              onClick={() => onShare(workflow)}
                            >
                              <WorkflowActionIcon kind="share" />
                            </button>

                            <button
                              type="button"
                              className="agent-action-icon agent-action-icon--danger"
                              title={t("admin.delete_btn")}
                              onClick={() => onDelete(workflow)}
                            >
                              <WorkflowActionIcon kind="delete" />
                            </button>
                          </>
                        )}
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
