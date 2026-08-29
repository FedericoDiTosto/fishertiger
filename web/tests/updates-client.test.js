import test from "node:test";
import assert from "node:assert/strict";
import { acceptSosFanta, checkSosFanta, sosFantaGuideUrl, updateStateLabel } from "../src/updates-client.js";

test("builds the SOS Fanta guide URL from the selected season", () => {
  assert.match(sosFantaGuideUrl("2026/27"), /2026-2027-tutti-consigli/);
  assert.equal(sosFantaGuideUrl("invalid"), "");
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
