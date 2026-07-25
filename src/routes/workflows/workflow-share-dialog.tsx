import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import type { Workflow, WorkflowWorkspace } from "./types";

interface ResourceGroupsResponse {
  group_ids: string[];
}

export function WorkflowShareDialog({
  workflow,
  workspaces,
  onClose,
  onSaved,
}: {
  workflow: Workflow;
  workspaces: WorkflowWorkspace[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useTranslation("workflows");
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const groups = workspaces.filter((workspace) => workspace.type === "team");
  const current = useQuery({
    queryKey: ["workflow-sharing", workflow.id],
    queryFn: ({ signal }) =>
      api.get<ResourceGroupsResponse>(
        `/api/sharing/workflow/${encodeURIComponent(workflow.id!)}/groups`,
        signal,
      ),
  });
  const save = useMutation({
    mutationFn: async () => {
      const before = new Set(current.data?.group_ids ?? []);
      const after = new Set(
        groups
          .filter((group) => changes[group.id] ?? before.has(group.id))
          .map((group) => group.id),
      );
      await Promise.all(
        groups.flatMap((group) => {
          if (after.has(group.id) && !before.has(group.id)) {
            return [
              api.post(`/api/sharing/workflow/${encodeURIComponent(workflow.id!)}`, {
                group_id: group.id,
              }),
            ];
          }
          if (!after.has(group.id) && before.has(group.id)) {
            return [
              api.delete(
                `/api/sharing/workflow/${encodeURIComponent(workflow.id!)}?group_id=${encodeURIComponent(group.id)}`,
              ),
            ];
          }
          return [];
        }),
      );
    },
    onSuccess: () => void onSaved(),
  });

  return (
    <div className="workflow-share-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="workflow-share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-share-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="workflow-section-label">{t("share.eyebrow")}</span>

            <h2 id="workflow-share-title">{t("share.title", { name: workflow.name })}</h2>
          </div>

          <button type="button" onClick={onClose} aria-label={t("share.close")}>
            ×
          </button>
        </header>

        <div className="workflow-share-body">
          <p>{t("share.description")}</p>

          {current.isPending ? (
            <div className="workflow-share-empty">{t("share.loading")}</div>
          ) : groups.length ? (
            <div className="workflow-share-list">
              {groups.map((group) => {
                const checked =
                  changes[group.id] ?? current.data?.group_ids.includes(group.id) ?? false;
                return (
                  <label key={group.id}>
                    <span className="workflow-share-group-icon" aria-hidden="true">
                      {group.name.charAt(0).toUpperCase()}
                    </span>

                    <span>
                      <strong>{group.name}</strong>

                      <small>{checked ? t("share.with_access") : t("share.without_access")}</small>
                    </span>

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        setChanges((values) => ({
                          ...values,
                          [group.id]: event.target.checked,
                        }))
                      }
                    />
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="workflow-share-empty">{t("share.no_groups")}</div>
          )}

          {save.isError && <p className="form-error">{save.error.message}</p>}
        </div>

        <footer>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t("share.cancel")}
          </button>

          <button
            className="btn btn-primary"
            type="button"
            disabled={save.isPending || current.isPending || !groups.length}
            onClick={() => save.mutate()}
          >
            {save.isPending ? t("share.saving") : t("share.save")}
          </button>
        </footer>
      </section>
    </div>
  );
}
