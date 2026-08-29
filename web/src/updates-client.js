import { apiUrl } from "./profile-client.js";

export class UpdateClientError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = "UpdateClientError";
    this.code = code;
    this.status = status;
  }
}

export const sosFantaGuideUrl = (season) => {
  const match = String(season || "").trim().match(/^(\d{4})\/(\d{2}|\d{4})$/);
  if (!match) return "";
  const end = match[2].length === 2 ? `${match[1].slice(0, 2)}${match[2]}` : match[2];
  return `https://www.sosfanta.com/guida-asta-fantacalcio/guida-asta-fantacalcio-${match[1]}-${end}-tutti-consigli-fasce-chi-prendere/`;
};

const updateRequest = async (action, profile, { apiBase = "", fetchImpl = globalThis.fetch, contentHash = "" } = {}) => {
  if (typeof fetchImpl !== "function")
    throw new UpdateClientError("fetch_unavailable", "Fetch non disponibile.");
  let response;
  try {
    response = await fetchImpl(apiUrl(`/api/updates/sosfanta/${action}`, apiBase), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, content_hash: contentHash }),
    });
  } catch (cause) {
    throw new UpdateClientError("network_error", "Impossibile contattare il backend.", undefined, { cause });
  }
  if (action === "bundle" && response.ok) return response;
  let payload;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new UpdateClientError("invalid_response", "Il backend ha restituito una risposta non valida.", response.status, { cause });
  }
  if (!response.ok) {
    const code = payload.error?.code || "request_failed";
    const staleBackend = response.status === 404 && code === "not_found";
    throw new UpdateClientError(
      staleBackend ? "backend_restart_required" : code,
      staleBackend
        ? "Il backend in esecuzione non include ancora la funzione Aggiornamenti. Riavvialo e riprova."
        : payload.error?.message || `Errore ${response.status}`,
      response.status,
    );
  }
  return payload;
};

export const checkSosFanta = (profile, options) => updateRequest("check", profile, options);
export const getSosFantaStatus = (profile, options) => updateRequest("status", profile, options);
export const acceptSosFanta = (profile, options) => updateRequest("accept", profile, options);
export const fetchSosFantaBundle = (profile, options) => updateRequest("bundle", profile, options);

export const updateStateLabel = (state) => ({
  never_checked: "Non ancora verificato",
  baseline_missing: "Riferimento iniziale da salvare",
  unchanged: "Nessun aggiornamento",
  changed: "Aggiornamenti disponibili",
}[state] || "Non ancora verificato");
