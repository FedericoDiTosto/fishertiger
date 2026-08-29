import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptSosFanta,
  applyPlayerList,
  checkSosFanta,
  fantacalcioDownloadUrl,
  sosFantaGuideUrl,
  updateStateLabel,
  uploadPlayerListCandidate,
} from "../src/updates-client.js";

test("builds the SOS Fanta guide URL from the selected season", () => {
  assert.match(sosFantaGuideUrl("2026/27"), /2026-2027-tutti-consigli/);
  assert.equal(sosFantaGuideUrl("invalid"), "");
});

test("maps profile seasons to official Fantacalcio downloads", () => {
  assert.equal(fantacalcioDownloadUrl("2026/27"), "https://www.fantacalcio.it/api/v1/Excel/prices/21/1");
  assert.equal(fantacalcioDownloadUrl("2027/2028"), "https://www.fantacalcio.it/api/v1/Excel/prices/22/1");
  assert.equal(fantacalcioDownloadUrl("2026/28"), "");
});

test("uploads a candidate to the profile and season scoped endpoint", async () => {
  let request;
  const file = { name: "listone.xlsx" };
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, json: async () => ({ state: "candidate_ready" }) };
  };
  await uploadPlayerListCandidate(file, { profile_id: "league", season: { season: "2026/27" } }, { fetchImpl });
  assert.equal(request.url, "/api/updates/player-list/candidate/league/2026-27");
  assert.equal(request.options.headers["X-Filename"], "listone.xlsx");
  assert.equal(request.options.body, file);
});

test("sends the reviewed candidate hash when applying a listone", async () => {
  let body;
  const fetchImpl = async (_url, options) => {
    body = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ dataset_path: "league/2026-27/auction_data.json" }) };
  };
  await applyPlayerList({ profile_id: "league" }, "a".repeat(64), "b".repeat(64), "c".repeat(64), { fetchImpl });
  assert.equal(body.candidate_hash, "a".repeat(64));
  assert.equal(body.profile_hash, "b".repeat(64));
  assert.equal(body.active_hash, "c".repeat(64));
});

test("sends the reviewed hash when accepting a snapshot", async () => {
  let body;
  const fetchImpl = async (_url, options) => {
    body = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ state: "unchanged" }) };
  };
  await acceptSosFanta({ profile_id: "test" }, { fetchImpl, contentHash: "abc" });
  assert.equal(body.content_hash, "abc");
});

test("normalizes network and invalid response failures", async () => {
  await assert.rejects(
    checkSosFanta({}, { fetchImpl: async () => { throw new TypeError("offline"); } }),
    (error) => error.code === "network_error",
  );
  await assert.rejects(
    checkSosFanta({}, { fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError(); } }) }),
    (error) => error.code === "invalid_response",
  );
});

test("presents update states in Italian", () => {
  assert.equal(updateStateLabel("changed"), "Aggiornamenti disponibili");
  assert.equal(updateStateLabel(), "Non ancora verificato");
});

test("explains when the running backend needs to be restarted", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ error: { code: "not_found", message: "The requested endpoint does not exist." } }),
  });
  await assert.rejects(
    checkSosFanta({ profile_id: "test" }, { fetchImpl }),
    (error) => error.code === "backend_restart_required" && /Riavvialo/.test(error.message),
  );
});
