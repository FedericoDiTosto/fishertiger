import {
  AUCTION_STORAGE_VERSION,
  auctionStorageKey,
  emptyAuction,
  legalMaxBid,
  playerIdKey,
  rehydrateAuction,
  slotsLeft,
} from "./auction-state.js";
import { activeNominationRole } from "./auction-nomination.js";

export const userTeamStorageKey = (profileId) =>
  `fanta-auction-user-team:${encodeURIComponent(profileId || "default")}`;

export const defaultUserTeamIndex = (rules) => {
  const configured = Number(rules?.userTeam);
  const byIndex =
    Number.isInteger(configured) &&
    configured >= 0 &&
    configured < rules?.participants
      ? configured
      : (rules?.teamNames?.indexOf(rules?.userTeam) ?? -1);
  return Math.max(0, byIndex);
};

const inRange = (index, rules) =>
  Number.isInteger(index) && index >= 0 && index < rules?.participants;

export const readUserTeamIndex = (profileId, rules) => {
  try {
    const stored = Number(localStorage.getItem(userTeamStorageKey(profileId)));
    return inRange(stored, rules) ? stored : defaultUserTeamIndex(rules);
  } catch {
    return defaultUserTeamIndex(rules);
  }
};

export const writeUserTeamIndex = (profileId, index) => {
  try {
    localStorage.setItem(userTeamStorageKey(profileId), String(index));
  } catch {}
};

const listeners = new Set();

export const notifyAuctionChanged = () => {
  for (const listener of [...listeners]) listener();
};

export const subscribeAuctionChanges = (listener) => {
  listeners.add(listener);
  const onStorage = (event) => {
    if (!event.key || event.key.startsWith("fanta-auction")) listener();
  };
  if (typeof window !== "undefined")
    window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined")
      window.removeEventListener("storage", onStorage);
  };
};

const readSaved = (profileId) => {
  try {
    return JSON.parse(
      localStorage.getItem(auctionStorageKey(profileId)) || "null",
    );
  } catch {
    return null;
  }
};

const loadAuctionState = (profileId, players, rules) =>
  rehydrateAuction(readSaved(profileId), players, rules) || emptyAuction(rules);

export const readAuctionBoard = (profileId, players, rules) => {
  const state = loadAuctionState(profileId, players, rules);
  return {
    teams: state.teams.map((team, index) => ({
      ...team,
      index,
      maxBid: legalMaxBid(team, rules),
      slotsLeft: slotsLeft(team, rules),
    })),
    teamNames: state.teams.map((team) => team.name),
    assigned: state.assigned,
    history: state.history,
    taken: Object.keys(state.assigned).length,
    activeRole: activeNominationRole(state.teams, rules),
    userTeamIndex: readUserTeamIndex(profileId, rules),
  };
};

const failure = (message) => ({ ok: false, message });

const compact = ({ playerId, owner, price }) => ({ playerId, owner, price });

const commit = (profileId, state, history, players, rules, message) => {
  const payload = {
    version: AUCTION_STORAGE_VERSION,
    teams: state.teams.map(({ name, startingCredits }) => ({
      name,
      startingCredits,
    })),
    history,
    undone: [],
  };
  if (!rehydrateAuction(payload, players, rules))
    return failure("Operazione incompatibile con lo stato dell'asta.");
  try {
    localStorage.setItem(auctionStorageKey(profileId), JSON.stringify(payload));
  } catch {
    return failure("Memoria del browser non disponibile: nulla e stato salvato.");
  }
  notifyAuctionChanged();
  return { ok: true, message };
};

const ROLE_NAMES = {
  P: "portieri",
  D: "difensori",
  C: "centrocampisti",
  A: "attaccanti",
};

export const assignPlayerInAuction = (profileId, players, rules, request) => {
  const state = loadAuctionState(profileId, players, rules);
  const player = (players || []).find(
    (candidate) => playerIdKey(candidate.id) === playerIdKey(request?.playerId),
  );
  const owner = Number(request?.owner);
  const price = Number(request?.price);
  const team = state.teams[owner];
  if (!player) return failure("Giocatore non presente nel dataset.");
  if (!team) return failure("Scegli una squadra acquirente.");
  if (state.assigned[playerIdKey(player.id)])
    return failure(`${player.nome} risulta gia assegnato.`);
  const role = activeNominationRole(state.teams, rules);
  if (role && player.ruolo !== role)
    return failure(
      `In questa fase puoi assegnare solo ${ROLE_NAMES[role] || role}.`,
    );
  if (!Number.isInteger(price) || price < rules.auction.minPrice)
    return failure(
      `Inserisci un prezzo intero di almeno ${rules.auction.minPrice} crediti.`,
    );
  if ((price - rules.auction.minPrice) % rules.auction.increment)
    return failure(
      `Il prezzo deve salire di ${rules.auction.increment} crediti a partire da ${rules.auction.minPrice}.`,
    );
  const legalMax = legalMaxBid(team, rules);
  if (price > legalMax)
    return failure(
      `${team.name} puo spendere al massimo ${legalMax} crediti senza restare senza rosa.`,
    );
  if (slotsLeft(team, rules)[player.ruolo] < 1)
    return failure(
      `${team.name} non ha piu posti per ${ROLE_NAMES[player.ruolo] || player.ruolo}.`,
    );
  return commit(
    profileId,
    state,
    [...state.history.map(compact), { playerId: player.id, owner, price }],
    players,
    rules,
    `${player.nome} assegnato a ${team.name} per ${price} crediti.`,
  );
};

export const releasePlayerInAuction = (profileId, players, rules, playerId) => {
  const state = loadAuctionState(profileId, players, rules);
  const record = state.assigned[playerIdKey(playerId)];
  if (!record) return failure("Il giocatore non risulta assegnato.");
  const player = (players || []).find(
    (candidate) => playerIdKey(candidate.id) === playerIdKey(playerId),
  );
  return commit(
    profileId,
    state,
    state.history
      .filter(
        (transaction) =>
          playerIdKey(transaction.playerId) !== playerIdKey(playerId),
      )
      .map(compact),
    players,
    rules,
    `${player?.nome || "Giocatore"} rimesso tra i disponibili.`,
  );
};

export const playerAuctionStatus = (board, player) => {
  const record = board?.assigned?.[playerIdKey(player?.id)];
  if (!record) return null;
  return {
    owner: record.owner,
    price: record.price,
    ownerName: board.teamNames[record.owner] || `Squadra ${record.owner + 1}`,
    mine: record.owner === board.userTeamIndex,
  };
};
