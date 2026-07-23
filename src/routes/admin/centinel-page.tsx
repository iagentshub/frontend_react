import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError, streamEvents } from "@/api/client";
import "@/styles/routes/admin/admin.css";
import "@/styles/routes/admin/centinel/centinel.css";
import "@/styles/routes/admin/centinel/centinel-stress.css";

interface TestFile { file: string; tests: string[]; count: number }
interface TestDirectory { dir: string; files: TestFile[]; count: number }
interface TestTree { dirs: TestDirectory[] }
interface TestSummary { passed?: number; failed?: number; error?: number; skipped?: number; warning?: number; duration_s?: number }
interface RunnerStatus { status: "idle" | "running" | "done" | "aborted" | "error"; run_id?: string | null; target?: string | null; started_at?: number | null; finished_at?: number | null; summary?: TestSummary; failed_ids?: string[] }
interface TestEvent { type: "started" | "collecting" | "test" | "summary" | "done" | "aborted" | "error"; run_id?: string; target?: string; count?: number; file?: string; name?: string; status?: "passed" | "failed" | "error" | "skipped"; progress?: number; traceback?: string | null; failed_ids?: string[]; exit_code?: number; message?: string; passed?: number; failed?: number; skipped?: number; duration_s?: number }
type CompletedTestEvent = TestEvent & { type: "test"; file: string; name: string; status: "passed" | "failed" | "error" | "skipped" };
interface HistoryItem { run_id: string; target: string; started_at?: number; finished_at?: number; status: string; summary?: TestSummary }

function errorText(error: unknown) { return error instanceof ApiError ? error.message : "No se pudo completar la operación."; }

export function CentinelPage() {
  const [section, setSection] = useState<"functional" | "stress" | "probe">("functional");
  const subtitles = {
    functional: "Test runner del backend",
    stress: "Pruebas de rendimiento",
    probe: "Búsqueda automática del punto de quiebre",
  };
  return (
    <main className="page-content centinel-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Centinel
          </h1>
          <p className="page-subtitle">{subtitles[section]}</p>
        </div>
        <div className="ctn-section-tabs" role="tablist" aria-label="Secciones de Centinel">
          <button role="tab" aria-selected={section === "functional"} className={`ctn-section-tab${section === "functional" ? " active" : ""}`} onClick={() => setSection("functional")}>✓ Funcionalidad</button>
          <button role="tab" aria-selected={section === "stress"} className={`ctn-section-tab${section === "stress" ? " active" : ""}`} onClick={() => setSection("stress")}>⌁ Rendimiento</button>
          <button role="tab" aria-selected={section === "probe"} className={`ctn-section-tab${section === "probe" ? " active" : ""}`} onClick={() => setSection("probe")}>◷ Buscar límite</button>
        </div>
      </div>
      {section === "functional" && <FunctionalRunner />}
      {section === "stress" && <StressRunner />}
      {section === "probe" && <ProbeRunner />}
    </main>
  );
}

function FunctionalRunner() {
  const tree = useQuery({ queryKey: ["centinel", "tree"], queryFn: ({ signal }) => api.get<TestTree>("/api/admin/centinel/tree", signal), staleTime: 5 * 60_000 });
  const status = useQuery({ queryKey: ["centinel", "status"], queryFn: ({ signal }) => api.get<RunnerStatus>("/api/admin/centinel/status", signal), refetchInterval: (query) => query.state.data?.status === "running" ? 3000 : false });
  const history = useQuery({ queryKey: ["centinel", "history"], queryFn: ({ signal }) => api.get<HistoryItem[]>("/api/admin/centinel/history", signal) });
  const refetchStatus = status.refetch;
  const refetchHistory = history.refetch;
  const [selection, setSelection] = useState<Set<string> | null>(null); const [runId, setRunId] = useState<string | null>(null); const [events, setEvents] = useState<TestEvent[]>([]); const [summary, setSummary] = useState<TestSummary | null>(null); const [filter, setFilter] = useState<"all" | "failed" | "passed" | "skipped">("all"); const [showLog, setShowLog] = useState(false); const [treeSearch, setTreeSearch] = useState("");
  const allFiles = useMemo(() => (tree.data?.dirs ?? []).flatMap((directory) => directory.files.map((file) => file.file)), [tree.data]);
  const selectedFiles = useMemo(() => selection ?? new Set(allFiles), [allFiles, selection]); const currentRunId = runId ?? (status.data?.status === "running" ? status.data.run_id ?? null : null); const running = Boolean(currentRunId) && (status.data?.status === "running" || runId !== null);
  const start = useMutation({ mutationFn: ({ target, rerun }: { target: string; rerun: boolean }) => api.post<{ run_id: string; status: string }>("/api/admin/centinel/run", { target, rerun_failed: rerun }), onSuccess: (result) => { setEvents([]); setSummary(null); setRunId(result.run_id); } });
  const abort = useMutation({ mutationFn: () => api.delete("/api/admin/centinel/run"), onSuccess: () => { setRunId(null); void status.refetch(); void history.refetch(); } });
  useEffect(() => {
    if (!currentRunId) return;
    const controller = new AbortController();
    void (async () => {
      while (!controller.signal.aborted) {
        try {
          for await (const event of streamEvents<TestEvent>(`/api/admin/centinel/stream/${encodeURIComponent(currentRunId)}`, { signal: controller.signal })) {
            const item = event.data;
            setEvents((current) => {
              const signature = JSON.stringify(item);
              return current.some((entry) => JSON.stringify(entry) === signature)
                ? current
                : [...current, item];
            });
            if (item.type === "summary") setSummary(item);
            if (item.type === "done" || item.type === "aborted" || item.type === "error") {
              setRunId(null);
              await Promise.all([refetchStatus(), refetchHistory()]);
              return;
            }
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          console.error("Centinel SSE", error);
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
    })();
    return () => controller.abort();
  }, [currentRunId, refetchHistory, refetchStatus]);
  const tests = events.filter((event): event is CompletedTestEvent => event.type === "test" && Boolean(event.file && event.name && event.status));
  const groups = useMemo(() => tests.reduce<Map<string, CompletedTestEvent[]>>((result, event) => {
    const group = result.get(event.file) ?? [];
    group.push(event);
    result.set(event.file, group);
    return result;
  }, new Map()), [tests]);
  const pendingFiles = useMemo(() => (tree.data?.dirs ?? []).flatMap((directory) => directory.files).filter((file) => selectedFiles.has(file.file)), [tree.data, selectedFiles]);
  const localSummary = summary ?? (status.data?.status === "done" ? status.data.summary : null) ?? tests.reduce<TestSummary>((result, test) => {
    if (test.status === "passed") result.passed = (result.passed ?? 0) + 1;
    else if (test.status === "skipped") result.skipped = (result.skipped ?? 0) + 1;
    else result.failed = (result.failed ?? 0) + 1;
    return result;
  }, {});
  const progress = tests.at(-1)?.progress ?? 0;
  const launch = (rerun = false) => { const files = [...selectedFiles]; const target = files.length === allFiles.length ? "tests/" : files.join(" "); if (target) start.mutate({ target, rerun }); };
  const toggle = (file: string, checked: boolean) => { const next = new Set(selectedFiles); if (checked) next.add(file); else next.delete(file); setSelection(next); };
  const logText = events.map((event) => event.type === "test" ? `${event.file}::${event.name} ${(event.status ?? "pending").toUpperCase()} [${event.progress}%]${event.traceback ? `\n${event.traceback}` : ""}` : event.type === "started" ? `=== Run iniciado: ${event.target} ===` : event.type === "collecting" ? `collected ${event.count} items` : event.type === "error" ? `ERROR: ${event.message}` : event.type === "aborted" ? "--- Run abortado ---" : "").filter(Boolean).join("\n");
  const downloadLog = () => downloadBlob(`centinel-${fileTimestamp()}.log`, logText, "text/plain");
  return <>{(localSummary.passed !== undefined || localSummary.failed || localSummary.skipped) && <div className="ctn-summary-bar"><span className="ctn-badge passed">✓ {localSummary.passed ?? 0} pasados</span>{Boolean(localSummary.failed) && <span className="ctn-badge failed">✗ {localSummary.failed} fallidos</span>}{Boolean(localSummary.skipped) && <span className="ctn-badge skipped">⊘ {localSummary.skipped} omitidos</span>}<span className="ctn-badge">{tests.length} en total</span></div>}
    <div className="ctn-header-actions"><button id="btn-run" className="btn btn-primary btn-sm" disabled={running || start.isPending || selectedFiles.size === 0} onClick={() => launch(false)}><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 5 }}><path d="M4 2l10 6-10 6V2z" /></svg>Ejecutar</button>{(status.data?.failed_ids?.length ?? 0) > 0 && <button className="btn btn-ghost btn-sm" disabled={running} onClick={() => launch(true)}>Re-run fallidos</button>}{running && <button className="btn btn-danger btn-sm" disabled={abort.isPending} onClick={() => abort.mutate()}>Abortar</button>}</div>
    {running && <div className="ctn-progress-wrap"><div className="ctn-progress-track"><div className="ctn-progress-bar" style={{ width: `${progress}%` }} /></div><span className="ctn-progress-text">{progress}%</span><span className="ctn-progress-current">{tests.at(-1)?.file}</span></div>}
    {(tree.error || status.error || start.error || abort.error) && <p className="form-error">{errorText(tree.error ?? status.error ?? start.error ?? abort.error)}</p>}
    <div className="ctn-layout"><aside className="ctn-tree-panel"><div className="ctn-panel-hdr"><span className="ctn-panel-title">Módulos</span><input type="search" className="ctn-search" placeholder="Filtrar…" value={treeSearch} onChange={(event) => setTreeSearch(event.target.value)} /></div><div className="ctn-tree-body">{tree.isPending ? <div className="ctn-tree-loading">Descubriendo tests…</div> : tree.data?.dirs.filter((directory) => !treeSearch || directory.dir.toLowerCase().includes(treeSearch.toLowerCase()) || directory.files.some((file) => file.file.toLowerCase().includes(treeSearch.toLowerCase()))).map((directory) => <details className="ctn-dir-item" key={directory.dir}><summary className="ctn-dir-hdr"><span className="ctn-dir-name">{directory.dir}</span><span className="ctn-dir-count">{directory.count}</span></summary><div className="ctn-dir-files">{directory.files.map((file) => <label className="ctn-file-row" key={file.file}><input className="ctn-file-cb" type="checkbox" checked={selectedFiles.has(file.file)} onChange={(event) => toggle(file.file, event.target.checked)} /><span className={`ctn-file-dot ${tests.some((test) => test.file === file.file && (test.status === "failed" || test.status === "error")) ? "failed" : tests.some((test) => test.file === file.file && test.status === "passed") ? "passed" : ""}`} /><span className="ctn-file-name" title={file.file}>{file.file.split("/").at(-1)}</span><span className="ctn-file-count">{file.count}</span></label>)}</div></details>)}</div><div className="ctn-tree-footer"><button className="btn btn-ghost btn-xs" onClick={() => setSelection(null)}>Todo</button><button className="btn btn-ghost btn-xs" onClick={() => setSelection(new Set())}>Ninguno</button><span className="ctn-sel-count">{(tree.data?.dirs ?? []).flatMap((directory) => directory.files).filter((file) => selectedFiles.has(file.file)).reduce((total, file) => total + file.count, 0)}/{(tree.data?.dirs ?? []).reduce((total, directory) => total + directory.count, 0)}</span></div></aside>
      <section className="ctn-results-panel"><div className="ctn-panel-hdr"><span className="ctn-panel-title">Resultados</span><div className="ctn-filter-tabs">{(["all", "failed", "passed", "skipped"] as const).map((value) => <button key={value} className={`ctn-filter-tab${filter === value ? " active" : ""}`} onClick={() => setFilter(value)}>{{ all: "Todos", failed: "Fallidos", passed: "Pasados", skipped: "Omitidos" }[value]}</button>)}</div><button className={`btn-icon-log${showLog ? " active" : ""}`} title="Ver log en tiempo real" onClick={() => setShowLog((value) => !value)}>◉</button>{logText && <button className="btn-icon-log" title="Descargar informe" onClick={downloadLog}>⇩</button>}</div>{showLog ? <pre className="ctn-log-pane" style={{ display: "block" }}>{logText}</pre> : <div className="ctn-results-body">{groups.size ? [...groups.entries()].map(([file, fileTests]) => { const visible = fileTests.filter((test) => filter === "all" || (filter === "failed" ? test.status === "failed" || test.status === "error" : test.status === filter)); return visible.length ? <details className="ctn-file-section" open key={file}><summary className="ctn-file-sec-hdr"><span className="ctn-file-sec-name">{file}</span><span className="ctn-file-sec-badges"><span className="ctn-sec-badge passed">{fileTests.filter((test) => test.status === "passed").length} ✓</span>{fileTests.some((test) => test.status === "failed" || test.status === "error") && <span className="ctn-sec-badge failed">{fileTests.filter((test) => test.status === "failed" || test.status === "error").length} ✗</span>}</span></summary><div className="ctn-file-sec-body">{visible.map((test) => <div key={test.name}><div className={`ctn-test-row${test.traceback ? " clickable" : ""}`}><span className={`ctn-test-icon ${test.status}`}>{test.status === "passed" ? "✓" : test.status === "skipped" ? "⊘" : "✗"}</span><span className={`ctn-test-name ${test.status}`}>{test.name}</span></div>{test.traceback && <details><summary className="ctn-traceback-toggle">Ver traceback</summary><pre className="ctn-traceback open">{test.traceback}</pre></details>}</div>)}</div></details> : null; }) : pendingFiles.length ? pendingFiles.map((file) => <details className="ctn-file-section" open key={file.file}><summary className="ctn-file-sec-hdr"><span className="ctn-file-sec-name">{file.file}</span><span className="ctn-file-sec-badges"><span className="ctn-sec-badge">Pendiente</span></span></summary><div className="ctn-file-sec-body">{file.tests.map((test) => <div className="ctn-test-row pending" key={test}><span className="ctn-test-icon pending">○</span><span className="ctn-test-name pending">{test}</span></div>)}</div></details>) : <div className="ctn-empty-state"><p>{running ? "Ejecutando…" : "Ejecuta los tests para ver los resultados"}</p></div>}</div>}</section></div>
    <div className="ctn-history-section"><div className="ctn-history-title">Historial reciente</div><div className="ctn-history-list">{history.data?.length ? history.data.map((item) => <div className="ctn-history-row" key={item.run_id}><span className={`ctn-history-dot ${item.summary?.failed ? "failed" : item.status}`} /><span className="ctn-history-date">{item.started_at ? new Date(item.started_at * 1000).toLocaleString("es-ES") : "—"}</span><span className="ctn-history-target">{item.target}</span><span className="ctn-history-summary">✓ {item.summary?.passed ?? 0} {item.summary?.failed ? `· ✗ ${item.summary.failed}` : ""}</span><span className="ctn-history-dur">{item.finished_at && item.started_at ? `${(item.finished_at - item.started_at).toFixed(1)}s` : "—"}</span></div>) : <div className="ctn-history-empty">Sin ejecuciones previas</div>}</div></div>
  </>;
}

interface StressTick { type?: string; tick: number; count: number; errors: number; avg_s: number; p95_s: number; min_s: number; max_s: number; rps: number; active_users?: number }
interface StressError { t: number; method: string; path: string; status?: number | null; msg: string; s: number }
interface StressResult { total?: number; errors?: number; duration_s?: number; rps?: number; avg_s?: number; avg_per_user_s?: number; min_s?: number; max_s?: number; p50_s?: number; p90_s?: number; p95_s?: number; p99_s?: number }
interface StressStatus { status: "idle" | "running" | "done" | "aborted" | "error"; run_id?: string | null; result?: StressResult; ticks?: StressTick[]; errors?: StressError[]; requested_users?: number | null; effective_users?: number | null }
interface PlatformSettings { stress_max_concurrency?: number }
interface ProbeTick { users: number; rps: number; errors: number; avg_s: number }
interface ProbeStep { users: number; effective_users?: number; total?: number; errors?: number; error_rate?: number; rps?: number; avg_s?: number; elapsed_s?: number; status: "running" | "ok" | "fail" }
interface ProbeVerdict { stable_users?: number | null; break_users?: number | null; error_rate?: number; break_total?: number; break_rps?: number; note?: string }
interface ProbeStatus { status: "idle" | "running" | "done" | "aborted" | "error"; run_id?: string | null; steps?: ProbeStep[]; ticks?: ProbeTick[]; current_users?: number | null; verdict?: ProbeVerdict | null; error?: string | null }

const endpoints = [
  ["RANDOM", "Random (endpoints mixtos)"],
  ["/api/auth/me", "/api/auth/me"],
  ["/api/agents", "/api/agents"],
  ["/api/connections", "/api/connections"],
  ["/api/skills/private", "/api/skills/private"],
  ["/api/knowledge", "/api/knowledge"],
  ["custom", "Personalizado…"],
] as const;

function StressRunner() {
  const platform = useQuery({ queryKey: ["settings", "platform", "centinel"], queryFn: ({ signal }) => api.get<PlatformSettings>("/api/settings/platform", signal) });
  const [endpoint, setEndpoint] = useState("RANDOM");
  const [customPath, setCustomPath] = useState("/api/auth/me");
  const [method, setMethod] = useState("RANDOM");
  const [users, setUsers] = useState(10);
  const [customUsers, setCustomUsers] = useState(1001);
  const [duration, setDuration] = useState(30);
  const [rampUp, setRampUp] = useState(0);
  const [timeout, setTimeoutValue] = useState(10);
  const [fluctuate, setFluctuate] = useState(false);
  const [maxConcurrency, setMaxConcurrency] = useState<number | null>(null);
  const effectiveMaxConcurrency = maxConcurrency ?? platform.data?.stress_max_concurrency ?? 0;
  const effectiveUsers = users >= 1000 ? customUsers : users;
  const path = endpoint === "custom" ? customPath : endpoint;
  const status = useQuery({ queryKey: ["centinel", "stress"], queryFn: ({ signal }) => api.get<StressStatus>("/api/admin/centinel/stress/status", signal), refetchInterval: (query) => query.state.data?.status === "running" ? 800 : 5000 });
  const start = useMutation({
    mutationFn: () => api.post("/api/admin/centinel/stress/run", { path, method, users: effectiveUsers, duration, ramp_up: rampUp, timeout, fluctuate_users: fluctuate, max_concurrency: effectiveMaxConcurrency }),
    onSuccess: () => status.refetch(),
  });
  const abort = useMutation({ mutationFn: () => api.delete("/api/admin/centinel/stress/run"), onSuccess: () => status.refetch() });
  const running = status.data?.status === "running";
  const result = status.data?.result ?? {};
  const ticks = status.data?.ticks ?? [];
  const errors = status.data?.errors ?? [];
  const exportCsv = () => downloadBlob(
    `stress-${fileTimestamp()}.csv`,
    ["tick,count,errors,avg_s,p95_s,min_s,max_s,rps,active_users", ...ticks.map((tick) => [tick.tick, tick.count, tick.errors, tick.avg_s, tick.p95_s, tick.min_s, tick.max_s, tick.rps, tick.active_users ?? 0].join(","))].join("\n"),
    "text/csv",
  );
  const groupedErrors = summarizeErrors(errors);
  return (
    <>
      <div className="ctn-header-actions">
        {running
          ? <button className="btn btn-danger btn-sm" disabled={abort.isPending} onClick={() => abort.mutate()}>■ Detener</button>
          : <button className="btn btn-primary btn-sm" disabled={start.isPending || !path.startsWith("/")} onClick={() => start.mutate()}>▶ Iniciar prueba</button>}
      </div>
      <div className="stress-config-card">
        <div className="stress-config-grid">
          <div className="stress-field stress-field--wide">
            <label className="stress-label">Endpoint</label>
            <div className="stress-endpoint-row">
              <select className="stress-select" value={endpoint} onChange={(event) => {
                const value = event.target.value;
                setEndpoint(value);
                if (value === "RANDOM") setMethod("RANDOM");
                else if (method === "RANDOM") setMethod("GET");
              }}>{endpoints.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
              <select className="stress-select" value={method} disabled={endpoint === "RANDOM"} onChange={(event) => setMethod(event.target.value)}>
                {["GET", "POST", "DELETE", "RANDOM"].map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            {endpoint === "custom" && <input className="stress-input" value={customPath} onChange={(event) => setCustomPath(event.target.value)} placeholder="/api/…" />}
          </div>
          <div className="stress-field">
            <label className="stress-label">Usuarios concurrentes</label>
            <div className="stress-slider-row"><input className="stress-slider" type="range" min={1} max={1000} value={users} onChange={(event) => setUsers(Number(event.target.value))}/><span className="stress-val">{users}</span></div>
            {users >= 1000 && <input aria-label="Usuarios personalizados" className="stress-input" type="number" min={1001} max={10000} value={customUsers} onChange={(event) => setCustomUsers(Number(event.target.value))}/>}
            <label className="stress-checkbox-row"><input type="checkbox" checked={fluctuate} onChange={(event) => setFluctuate(event.target.checked)}/><span className="stress-checkbox-label">Fluctuar carga</span></label>
          </div>
          <Pills label="Duración" value={duration} values={[10, 30, 60, 300]} suffix="s" onChange={setDuration}/>
          <Pills label="Ramp-up" hint="Incorpora usuarios gradualmente durante este periodo." value={rampUp} values={[0, 5, 10, 30]} suffix="s" onChange={setRampUp}/>
          <Pills label="Timeout / req" value={timeout} values={[2, 3, 10, 30]} suffix="s" onChange={setTimeoutValue}/>
          <div className="stress-field">
            <label className="stress-label">Concurrencia máxima</label>
            <div className="stress-slider-row"><input className="stress-slider" type="range" min={0} max={1000} value={Math.min(effectiveMaxConcurrency, 1000)} onChange={(event) => setMaxConcurrency(Number(event.target.value))}/><span className="stress-val">{effectiveMaxConcurrency === 0 ? "∞" : effectiveMaxConcurrency}</span></div>
            {effectiveMaxConcurrency >= 1000 && <input aria-label="Concurrencia personalizada" className="stress-input" type="number" min={0} max={10000} value={effectiveMaxConcurrency} onChange={(event) => setMaxConcurrency(Number(event.target.value))}/>}
          </div>
        </div>
      </div>
      {(status.error || start.error || abort.error) && <p className="form-error">{errorText(status.error ?? start.error ?? abort.error)}</p>}
      {status.data?.effective_users && status.data.requested_users && status.data.effective_users < status.data.requested_users && <div className="stress-cap-notice">⚠ Se solicitaron {status.data.requested_users} usuarios, pero el servidor está ejecutando {status.data.effective_users} usuarios efectivos.</div>}
      <MetricChart
        title="Tiempo de respuesta en tiempo real"
        empty="Inicia la prueba para ver la gráfica"
        ticks={ticks.map((tick, index) => ({ x: index, avg: tick.avg_s, p95: tick.p95_s, rps: tick.rps, users: tick.active_users ?? 0, errors: tick.errors }))}
      />
      {Object.keys(result).length > 0 && (
        <div className="stress-summary-card">
          <div className="stress-summary-header"><div className="stress-summary-title">Resultados</div><button className="btn btn-ghost btn-sm" onClick={exportCsv}>Exportar CSV</button></div>
          <div className="stress-summary-grid stress-summary-grid--compact">
            <Stat label="Peticiones totales" value={result.total}/>
            <Stat label="Errores" value={`${result.errors ?? 0} (${result.total ? (((result.errors ?? 0) / result.total) * 100).toFixed(1) : "0.0"}%)`} danger={Boolean(result.errors)}/>
            <Stat label="Media de resolución" value={formatSeconds(result.avg_s)}/>
            <Stat label="Media por usuario" value={formatSeconds(result.avg_per_user_s)} danger={Boolean(result.avg_s && result.avg_per_user_s && result.avg_per_user_s > result.avg_s * 1.15)}/>
          </div>
          <div className="stress-percentiles">{[["req/s", result.rps], ["p50", formatSeconds(result.p50_s)], ["p90", formatSeconds(result.p90_s)], ["p95", formatSeconds(result.p95_s)], ["p99", formatSeconds(result.p99_s)], ["mín", formatSeconds(result.min_s)], ["máx", formatSeconds(result.max_s)]].map(([label, value]) => <span key={label}>{label}: <strong>{value ?? "—"}</strong></span>)}</div>
          {groupedErrors.length > 0 && <div className="stress-top3-grid">{groupedErrors.map((group) => <div className="stress-top3-row" key={group.label}><span>{group.label}</span><strong>{group.count}</strong></div>)}</div>}
        </div>
      )}
      <ErrorTable errors={errors}/>
    </>
  );
}

function ProbeRunner() {
  const [startUsers, setStartUsers] = useState(10);
  const [step, setStep] = useState(50);
  const [duration, setDuration] = useState(30);
  const [maxConcurrency, setMaxConcurrency] = useState(0);
  const [timeout, setTimeoutValue] = useState(10);
  const status = useQuery({ queryKey: ["centinel", "probe"], queryFn: ({ signal }) => api.get<ProbeStatus>("/api/admin/centinel/stress/probe", signal), refetchInterval: (query) => query.state.data?.status === "running" ? 800 : 5000 });
  const start = useMutation({ mutationFn: () => api.post("/api/admin/centinel/stress/probe", { path: "/api/auth/me", start_users: startUsers, step, duration, max_concurrency: maxConcurrency, timeout, error_threshold: 0 }), onSuccess: () => status.refetch() });
  const abort = useMutation({ mutationFn: () => api.delete("/api/admin/centinel/stress/probe"), onSuccess: () => status.refetch() });
  const data = status.data;
  const running = data?.status === "running";
  return (
    <>
      <div className="ctn-header-actions">{running ? <button className="btn btn-danger btn-sm" disabled={abort.isPending} onClick={() => abort.mutate()}>■ Detener</button> : <button className="btn btn-primary btn-sm" disabled={start.isPending} onClick={() => start.mutate()}>▶ Buscar límite</button>}</div>
      <div className="stress-config-card">
        <div className="probe-config-row">
          <NumberField label="Inicio" value={startUsers} min={1} max={999} onChange={setStartUsers}/>
          <NumberField label="Paso" value={step} min={1} max={1000} onChange={setStep}/>
          <Pills label="Duración por paso" value={duration} values={[10, 30, 60]} suffix="s" onChange={setDuration}/>
          <NumberField label="Concurrencia máx." value={maxConcurrency} min={0} max={10000} onChange={setMaxConcurrency}/>
          <NumberField label="Timeout/req (s)" value={timeout} min={1} max={60} onChange={setTimeoutValue}/>
        </div>
        <p className="probe-hint">Lanza pruebas secuenciales aumentando los usuarios hasta encontrar el primer nivel con errores.</p>
      </div>
      {(status.error || start.error || abort.error || data?.error) && <p className="form-error">{data?.error ?? errorText(status.error ?? start.error ?? abort.error)}</p>}
      <MetricChart title="Evolución en tiempo real" empty="Inicia la búsqueda para ver la evolución" ticks={(data?.ticks ?? []).map((tick, index) => ({ x: index, avg: tick.avg_s, p95: tick.avg_s, rps: tick.rps, users: tick.users, errors: tick.errors }))}/>
      <div className="probe-card">
        <div className="probe-card-header"><span className="probe-card-title">Pasos ejecutados</span>{running && <span className="ctn-badge">Probando {data?.current_users ?? startUsers} usuarios…</span>}</div>
        {(data?.steps ?? []).length ? <div className="stress-errors-wrap"><table className="probe-table"><thead><tr><th>Usuarios</th><th>Efectivos</th><th>Peticiones</th><th>Errores</th><th>req/s</th><th>Media</th><th>Duración</th><th>Estado</th></tr></thead><tbody>{data?.steps?.map((item, index) => <tr className={item.status === "fail" ? "probe-row--fail" : item.status === "running" ? "probe-row--running" : ""} key={`${item.users}-${index}`}><td>{item.users}</td><td>{item.effective_users ?? "—"}</td><td>{item.total ?? "—"}</td><td>{item.errors ?? "—"}{item.error_rate !== undefined ? ` (${(item.error_rate * 100).toFixed(1)}%)` : ""}</td><td>{item.rps ?? "—"}</td><td>{formatSeconds(item.avg_s)}</td><td>{item.elapsed_s !== undefined ? `${item.elapsed_s}s` : "—"}</td><td><span className={`probe-status probe-status--${item.status}`}>{item.status === "ok" ? "✓ Estable" : item.status === "fail" ? "✗ Límite" : "◌ Ejecutando"}</span></td></tr>)}</tbody></table></div> : <div className="ctn-empty-state">Todavía no hay pasos ejecutados.</div>}
      </div>
      {data?.verdict && <ProbeVerdictView verdict={data.verdict}/>}
    </>
  );
}

function MetricChart({ title, empty, ticks }: { title: string; empty: string; ticks: Array<{ x: number; avg: number; p95: number; rps: number; users: number; errors: number }> }) {
  const width = 1000, height = 220, pad = 28;
  const maxTime = Math.max(0.001, ...ticks.map((tick) => tick.p95));
  const maxRps = Math.max(1, ...ticks.map((tick) => tick.rps));
  const maxUsers = Math.max(1, ...ticks.map((tick) => tick.users));
  const x = (index: number) => pad + (ticks.length <= 1 ? 0 : index / (ticks.length - 1) * (width - pad * 2));
  const line = (value: (tick: typeof ticks[number]) => number, maximum: number) => ticks.map((tick, index) => `${index ? "L" : "M"}${x(index)},${height - pad - value(tick) / maximum * (height - pad * 2)}`).join(" ");
  return <div className="stress-chart-card"><div className="stress-chart-header"><span className="stress-chart-title">{title}</span><div className="stress-legend"><span className="stress-legend-item stress-legend--avg">Media</span><span className="stress-legend-item stress-legend--p95">p95</span><span className="stress-legend-item stress-legend--rps">req/s</span><span className="stress-legend-item stress-legend--users">Usuarios</span></div></div><div className="stress-chart-wrap">{ticks.length ? <svg className="stress-canvas" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={title}><path className="metric-line metric-line--avg" d={line((tick) => tick.avg, maxTime)}/><path className="metric-line metric-line--p95" d={line((tick) => tick.p95, maxTime)}/><path className="metric-line metric-line--rps" d={line((tick) => tick.rps, maxRps)}/><path className="metric-line metric-line--users" d={line((tick) => tick.users, maxUsers)}/>{ticks.map((tick, index) => tick.errors ? <circle className="metric-error" cx={x(index)} cy={height - pad - tick.p95 / maxTime * (height - pad * 2)} r="5" key={index}/> : null)}</svg> : <div className="stress-chart-empty"><p>{empty}</p></div>}</div></div>;
}

function ErrorTable({ errors }: { errors: StressError[] }) {
  if (!errors.length) return null;
  return <div className="stress-errors-card" style={{ display: "block" }}><div className="stress-errors-header"><span className="stress-errors-title">Errores detectados</span><span className="stress-errors-badge">{errors.length}</span></div><div className="stress-errors-wrap"><table className="stress-errors-table"><thead><tr><th>t (s)</th><th>Método</th><th>Endpoint</th><th>Código</th><th>Error</th><th>s</th></tr></thead><tbody>{errors.map((error, index) => <tr key={`${error.t}-${index}`}><td>{error.t}</td><td>{error.method}</td><td>{error.path}</td><td>{error.status ?? "—"}</td><td>{error.msg}</td><td>{error.s}</td></tr>)}</tbody></table></div></div>;
}

function ProbeVerdictView({ verdict }: { verdict: ProbeVerdict }) {
  const variant = verdict.break_users ? "fail" : verdict.stable_users ? "ok" : "warn";
  return <div className={`probe-verdict-banner probe-verdict--${variant}`}><div className="probe-verdict-row">{verdict.stable_users !== undefined && <span>Capacidad estable: <strong>{verdict.stable_users ?? "ninguna"}</strong></span>}{verdict.break_users && <><span className="probe-verdict-sep">→</span><span>Punto de quiebre: <strong>{verdict.break_users}</strong> usuarios</span></>}{verdict.error_rate !== undefined && <span>Error: <strong>{(verdict.error_rate * 100).toFixed(1)}%</strong></span>}{verdict.break_rps !== undefined && <span>Rendimiento: <strong>{verdict.break_rps} req/s</strong></span>}{verdict.note && <span>{verdict.note}</span>}</div></div>;
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="probe-cfg-label">{label}<input className="probe-num-input probe-num-input--wide" type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))}/></label>;
}

function Pills({ label, hint, value, values, suffix, onChange }: { label: string; hint?: string; value: number; values: number[]; suffix: string; onChange: (value: number) => void }) {
  return <div className="stress-field"><label className="stress-label" title={hint}>{label}{hint ? " ⓘ" : ""}</label><div className="stress-pills">{values.map((item) => <button type="button" key={item} className={`stress-pill${value === item ? " active" : ""}`} onClick={() => onChange(item)}>{item === 0 ? "Ninguno" : `${item}${suffix}`}</button>)}</div></div>;
}

function Stat({ label, value, danger }: { label: string; value: string | number | null | undefined; danger?: boolean }) {
  return <div className="stress-stat"><span className="stress-stat-val" style={danger ? { color: "var(--danger)" } : undefined}>{value === undefined || value === null ? "—" : String(value)}</span><span className="stress-stat-label">{label}</span></div>;
}

function summarizeErrors(errors: StressError[]) {
  const counts = new Map<string, number>();
  for (const error of errors) {
    const label = `${error.method} ${error.path}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, count]) => ({ label, count }));
}

function formatSeconds(value?: number) { return value === undefined ? "—" : `${value.toFixed(3)} s`; }
function fileTimestamp() { return new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-"); }
function downloadBlob(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

