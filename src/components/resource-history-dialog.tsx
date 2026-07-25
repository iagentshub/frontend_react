import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryClient } from "@/api/query-client";
import "./resource-history-dialog.css";

interface VersionSummary {
  version: number;
  created_by: string;
  created_at: string;
  reason: string;
}

interface VersionDetail extends VersionSummary {
  snapshot: Record<string, unknown>;
}

function versionName(item: VersionDetail): string {
  return typeof item.snapshot.name === "string"
    ? item.snapshot.name
    : i18n.t("dynamic.history_version", { version: item.version });
}

function changedFields(left: Record<string, unknown>, right: Record<string, unknown>): string[] {
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
    .sort();
}

export function ResourceHistoryButton({
  type,
  resourceId,
  onRestored,
}: {
  type: "agent" | "skill";
  resourceId: string;
  onRestored: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const versions = useQuery({
    queryKey: ["resource-versions", type, resourceId],
    enabled: open,
    queryFn: ({ signal }) =>
      api.get<VersionSummary[]>(
        `/api/resources/${type}/${encodeURIComponent(resourceId)}/versions`,
        signal,
      ),
  });
  const detail = useQuery({
    queryKey: ["resource-version", type, resourceId, selected],
    enabled: open && selected !== null,
    queryFn: ({ signal }) =>
      api.get<VersionDetail>(
        `/api/resources/${type}/${encodeURIComponent(resourceId)}/versions/${selected}`,
        signal,
      ),
  });
  const latestVersion = versions.data?.[0]?.version;
  const latest = useQuery({
    queryKey: ["resource-version", type, resourceId, latestVersion],
    enabled: open && latestVersion !== undefined && selected !== null && selected !== latestVersion,
    queryFn: ({ signal }) =>
      api.get<VersionDetail>(
        `/api/resources/${type}/${encodeURIComponent(resourceId)}/versions/${latestVersion}`,
        signal,
      ),
  });
  const restore = useMutation({
    mutationFn: (version: number) =>
      api.post(
        `/api/resources/${type}/${encodeURIComponent(resourceId)}/versions/${version}/restore`,
        {},
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resource-versions", type, resourceId] });
      onRestored();
      setOpen(false);
    },
  });

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        {t("legacy.text_302027905ce5")}
      </button>

      {open && (
        <div className="modal-bg resource-history-bg" role="dialog" aria-modal="true">
          <div className="resource-history">
            <header>
              <div>
                <span>{t("legacy.text_b25b2ed311c7")}</span>
                <h2>{t("legacy.text_2a08b6243197")}</h2>
              </div>

              <button onClick={() => setOpen(false)} aria-label={t("agents.chat.close")}>
                ×
              </button>
            </header>

            <div className="resource-history-body">
              <aside>
                {versions.data?.map((item) => (
                  <button
                    className={selected === item.version ? "active" : ""}
                    onClick={() => setSelected(item.version)}
                    key={item.version}
                  >
                    <strong>
                      {t("legacy.text_c7c836ddbae1")}
                      {item.version}
                    </strong>

                    <small>
                      {item.created_by} ·{" "}
                      {new Date(item.created_at).toLocaleString(
                        i18n.resolvedLanguage === "en" ? "en-GB" : "es-ES",
                      )}
                    </small>

                    <span>
                      {item.reason.startsWith("restore")
                        ? i18n.t("dynamic.text_245c8adc7c6a")
                        : "Guardado"}
                    </span>
                  </button>
                ))}

                {!versions.isPending && !versions.data?.length && (
                  <p>{t("legacy.text_ab34b0226688")}</p>
                )}
              </aside>

              <section>
                {detail.data ? (
                  <>
                    <h3>{versionName(detail.data)}</h3>

                    {latest.data && (
                      <div className="resource-version-diff">
                        <strong>{t("legacy.text_f36206e301e0")}</strong>

                        <div>
                          {changedFields(detail.data.snapshot, latest.data.snapshot).map(
                            (field) => (
                              <span key={field}>{field}</span>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    <pre>{JSON.stringify(detail.data.snapshot, null, 2)}</pre>

                    <button
                      className="btn btn-primary"
                      disabled={restore.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            i18n.t("dynamic.history_restore_confirm", {
                              version: detail.data?.version,
                            }),
                          )
                        ) {
                          restore.mutate(detail.data.version);
                        }
                      }}
                    >
                      {t("legacy.text_b3d721df6bd4")}
                    </button>
                  </>
                ) : (
                  <div className="resource-history-placeholder">
                    {t("legacy.text_03bfb2e6e8e4")}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
