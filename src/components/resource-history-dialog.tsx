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
    : `Versión ${item.version}`;
}

function changedFields(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): string[] {
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
    enabled:
      open &&
      latestVersion !== undefined &&
      selected !== null &&
      selected !== latestVersion,
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
        Historial
      </button>
      {open && (
        <div className="modal-bg resource-history-bg" role="dialog" aria-modal="true">
          <div className="resource-history">
            <header>
              <div><span>Control de cambios</span><h2>Historial de versiones</h2></div>
              <button onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </header>
            <div className="resource-history-body">
              <aside>
                {versions.data?.map((item) => (
                  <button
                    className={selected === item.version ? "active" : ""}
                    onClick={() => setSelected(item.version)}
                    key={item.version}
                  >
                    <strong>Versión {item.version}</strong>
                    <small>{item.created_by} · {new Date(item.created_at).toLocaleString()}</small>
                    <span>{item.reason.startsWith("restore") ? "Restauración" : "Guardado"}</span>
                  </button>
                ))}
                {!versions.isPending && !versions.data?.length && <p>Sin versiones guardadas.</p>}
              </aside>
              <section>
                {detail.data ? (
                  <>
                    <h3>{versionName(detail.data)}</h3>
                    {latest.data && (
                      <div className="resource-version-diff">
                        <strong>Cambios frente a la versión actual</strong>
                        <div>
                          {changedFields(detail.data.snapshot, latest.data.snapshot).map(
                            (field) => <span key={field}>{field}</span>,
                          )}
                        </div>
                      </div>
                    )}
                    <pre>{JSON.stringify(detail.data.snapshot, null, 2)}</pre>
                    <button
                      className="btn btn-primary"
                      disabled={restore.isPending}
                      onClick={() => {
                        if (confirm(`¿Restaurar la versión ${detail.data?.version}?`)) {
                          restore.mutate(detail.data.version);
                        }
                      }}
                    >
                      Restaurar esta versión
                    </button>
                  </>
                ) : <div className="resource-history-placeholder">Selecciona una versión para revisarla.</div>}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
