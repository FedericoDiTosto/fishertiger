import { useEffect, useRef, useState } from "react";
import {
  acceptSosFanta,
  checkSosFanta,
  fetchSosFantaBundle,
  getSosFantaStatus,
  sosFantaGuideUrl,
  updateStateLabel,
} from "./updates-client.js";

const ROLE_LABELS = { P: "Portieri", D: "Difensori", C: "Centrocampisti", A: "Attaccanti" };

export function Updates({ profile, apiBase = "" }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const requestSequence = useRef(0);
  const season = profile?.season?.season;
  const sourceUrl = result?.source_url || sosFantaGuideUrl(season);

  useEffect(() => {
    let active = true;
    const request = ++requestSequence.current;
    setResult(null);
    setBusy("");
    setMessage("");
    setProblem("");
    getSosFantaStatus(profile, { apiBase })
      .then((next) => {
        if (active && request === requestSequence.current) setResult(next);
      })
      .catch(() => {
        /* A missing or old backend is explained when the user starts a check. */
      });
    return () => {
      active = false;
    };
  }, [apiBase, profile?.profile_id, season]);

  const run = async (action) => {
    const request = ++requestSequence.current;
    setBusy(action);
    setMessage("");
    setProblem("");
    try {
      if (action === "check") {
        const next = await checkSosFanta(profile, { apiBase });
        if (request !== requestSequence.current) return;
        setResult(next);
        setMessage(next.state === "changed" ? `${next.change_count} sezioni modificate.` : "Verifica completata.");
      } else {
        const next = await acceptSosFanta(profile, { apiBase, contentHash: result?.content_hash });
        if (request !== requestSequence.current) return;
        setResult((current) => ({ ...current, ...next, changes: [], change_count: 0 }));
        setMessage("La versione verificata è stata salvata come riferimento.");
      }
    } catch (error) {
      if (request !== requestSequence.current) return;
      setProblem(error?.code || "request_failed");
      setMessage(error instanceof Error ? error.message : "Operazione non completata.");
    } finally {
      if (request === requestSequence.current) setBusy("");
    }
  };

  const downloadBundle = async () => {
    const request = ++requestSequence.current;
    setBusy("bundle");
    setMessage("");
    setProblem("");
    try {
      const response = await fetchSosFantaBundle(profile, { apiBase, contentHash: result?.content_hash });
      const blob = await response.blob();
      if (request !== requestSequence.current) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sosfanta-update-${season.replace("/", "-")}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Bundle AI scaricato.");
    } catch (error) {
      if (request !== requestSequence.current) return;
      setProblem(error?.code || "request_failed");
      setMessage(error instanceof Error ? error.message : "Download non completato.");
    } finally {
      if (request === requestSequence.current) setBusy("");
    }
  };

  return (
    <section className="updates-view">
      <div className="updates-heading">
        <span className="eyebrow">FONTI ESTERNE</span>
        <h1>Aggiornamenti</h1>
        <p>Controlla le fonti senza modificare automaticamente i dati locali.</p>
      </div>

      <div className="update-workflow" aria-label="Come usare gli aggiornamenti">
        <strong>Come funziona</strong>
        <ol>
          <li><b>Controlla</b><span>Scarica e confronta la guida della stagione selezionata.</span></li>
          <li><b>Prima verifica</b><span>Salva il contenuto attuale come riferimento iniziale.</span></li>
          <li><b>Verifiche successive</b><span>Se cambia qualcosa, esamina il diff e scarica il bundle AI.</span></li>
        </ol>
        <p>Questa funzione rileva e prepara gli aggiornamenti. Non modifica automaticamente <code>titolari.csv</code>.</p>
      </div>

      <article className="update-source-card">
        <header>
          <div>
            <span className="source-index">01</span>
            <h2>SOS Fanta</h2>
          </div>
          <span className={`update-state ${result?.state || "idle"}`}>{updateStateLabel(result?.state)}</span>
        </header>

        <div className="update-source-meta">
          <div><span>Stagione</span><strong>{season}</strong></div>
          <div><span>Ambito</span><strong>Guida asta, pagine 1-4</strong></div>
          <div><span>Ultimo controllo</span><strong>{result?.checked_at?.slice(0, 16).replace("T", " ") || "Mai"}</strong></div>
        </div>

        <a className="source-url" href={sourceUrl} target="_blank" rel="noreferrer">{sourceUrl}</a>

        <div className="update-actions">
          <button className="update-check-button" onClick={() => run("check")} disabled={Boolean(busy)}>
            {busy === "check" ? "Controllo in corso..." : "Controlla aggiornamenti"}
          </button>
          {result?.state === "changed" && (
            <button onClick={downloadBundle} disabled={Boolean(busy)}>
              {busy === "bundle" ? "Preparazione..." : "Scarica bundle AI"}
            </button>
          )}
          {(result?.state === "baseline_missing" || result?.state === "changed") && (
            <button className="quiet" onClick={() => run("accept")} disabled={Boolean(busy)}>
              {result.state === "baseline_missing" ? "Salva riferimento iniziale" : "Segna come acquisito"}
            </button>
          )}
        </div>
        {result?.state === "changed" && (
          <p className="accept-warning">Segna come acquisito solo dopo aver revisionato e applicato gli aggiornamenti necessari.</p>
        )}
        {problem === "backend_restart_required" && (
          <div className="update-error" role="alert">
            <strong>Backend da riavviare</strong>
            <p>{message}</p>
            <code>.venv/bin/python -m advisor.server --host 127.0.0.1 --port 8000</code>
          </div>
        )}
        {message && problem !== "backend_restart_required" && <p className={`update-message ${problem ? "error" : ""}`} role="status">{message}</p>}

        {result?.changes?.length > 0 && (
          <div className="update-diff">
            <div className="diff-title"><span>DIFF SEMANTICO</span><strong>{result.change_count} sezioni</strong></div>
            {result.changes.map((change, index) => (
              <details key={`${change.role}-${change.tier}-${index}`}>
                <summary>
                  <span>{ROLE_LABELS[change.role]} / {change.tier.replaceAll("_", " ")}</span>
                  <b>{change.change}</b>
                </summary>
                <div className="diff-columns">
                  <div><small>PRIMA</small><p>{change.old_text.join("\n\n") || change.old_players.join(", ") || "-"}</p></div>
                  <div><small>DOPO</small><p>{change.new_text.join("\n\n") || change.new_players.join(", ") || "-"}</p></div>
                </div>
              </details>
            ))}
          </div>
        )}
      </article>

      <aside className="update-method-note">
        <strong>Metodo</strong>
        <p>Il controllo confronta solo testo e fasce della guida. Menu, pubblicità e notizie correlate vengono escluse dall'hash. Nessuna riga CSV viene modificata da questa schermata.</p>
      </aside>
    </section>
  );
}
