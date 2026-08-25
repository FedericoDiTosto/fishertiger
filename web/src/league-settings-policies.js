export const sourceFormats = [
  { value: "csv", label: "CSV", help: "File di testo tabellare separato da virgole." },
  { value: "xlsx", label: "Excel (.xlsx)", help: "Foglio di calcolo Excel in formato .xlsx." },
  { value: "json", label: "JSON", help: "File strutturato in formato JSON." },
];

export const exactTiePolicies = [
  { value: "shared_rank", label: "Posizione condivisa", help: "Le squadre ancora pari occupano la stessa posizione in classifica." },
  { value: "sequential_rank", label: "Posizioni successive", help: "Le squadre ancora pari ricevono posizioni successive secondo l'ordine di elaborazione." },
];
export const nominationPolicies = [
  { value: "call", label: "Chiamata", help: "Ogni partecipante chiama liberamente il calciatore che vuole." },
  { value: "call_by_role", label: "Chiamata per ruolo", help: "Si procede per P, D, C e A; ogni ruolo termina quando tutte le rose hanno riempito i suoi posti." },
  { value: "random", label: "Randomica", help: "A ogni chiamata viene estratto casualmente un calciatore tra tutti i ruoli." },
  { value: "random_by_role", label: "Randomica per ruolo", help: "Si procede per P, D, C e A, estraendo casualmente un calciatore del ruolo attivo." },
  { value: "alphabetical", label: "Alfabetico", help: "I calciatori vengono chiamati in ordine alfabetico, senza divisione per ruolo." },
  { value: "alphabetical_by_role", label: "Alfabetico per ruolo", help: "Si procede per P, D, C e A, in ordine alfabetico dentro ogni ruolo." },
];
export const incompleteLineupPolicies = [
  { value: "zero_score", label: "Punteggio zero", help: "La formazione incompleta riceve 0 punti; il campo punteggio resta fissato a 0." },
  { value: "forfeit", label: "Sconfitta a tavolino", help: "La formazione incompleta perde la giornata a tavolino; il campo punteggio non viene usato." },
  { value: "allow_partial", label: "Consenti formazione parziale", help: "Si calcolano i punti dei soli calciatori schierabili; il campo punteggio non viene usato." },
];
export const tieBreakers = [
  { value: "goal_difference", label: "Differenza reti", help: "Precede chi ha la migliore differenza tra gol fatti e subiti." },
  { value: "head_to_head", label: "Scontri diretti", help: "Precede chi ha ottenuto più punti nelle partite contro le squadre a pari punti." },
  { value: "season_fantasy_score", label: "Punteggio fantasy stagionale", help: "Precede chi ha totalizzato più punti fantasy nella stagione." },
];

export const supportedValues = (choices) => new Set(choices.map(({ value }) => value));
