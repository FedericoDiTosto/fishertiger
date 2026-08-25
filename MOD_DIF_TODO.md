# Modificatore Difesa: Piano Di Implementazione

## Principi non negoziabili

- [ ] Mantenere storico, confronto giocatori, tassi di presenza, medie e calibrazione su tutte le 38 giornate di Serie A.
- [ ] Usare l'intervallo selezionato nello slider soltanto per la lega corrente: consigli d'asta, strategia di rosa, valore stagionale atteso e simulazione.
- [ ] Non attribuire un bonus fisso a portieri o difensori: il modificatore e' un valore di reparto, dipendente da formazione, rosa, presenze e alternative.
- [ ] Conservare i vincoli d'asta esistenti come limiti invalicabili: credito disponibile, riserva per slot, incrementi, ruoli e completamento rosa.
- [ ] Rendere ogni consiglio spiegabile: il valore dovuto al modificatore deve essere separato dal rendimento individuale.

## Stato attuale e correzioni di base

- [x] Rispettare `defense_modifier.enabled` nel simulatore browser.
- [x] Rendere identica la semantica del modificatore in Python e browser.
  - [x] Richiedere portiere con voto e almeno `required_defenders` difensori con voto.
  - [x] Calcolare la media con voto puro del portiere e migliori tre voti puri dei difensori.
  - [x] Selezionare la fascia piu' alta raggiunta.
  - [x] Non usare bonus, malus o fantavoti nella media difensiva.
  - [x] Non assegnare il bonus con formazione incompleta.
- [ ] Estrarre una funzione browser pura per il calcolo del bonus e riusarla nel simulatore mock e nel valutatore d'asta.
- [x] Correggere il simulatore mock browser affinche' riconosca il calendario canonico e non generi un calendario fittizio quando il calendario reale e' presente.
- [x] Aggiungere vettori di parita' Python/browser per soglie, portiere, migliori tre difensori, quinto difensore e formazione incompleta.

## Orizzonti temporali

- [ ] Formalizzare due orizzonti distinti nel modello.
  - [ ] `historical_horizon`: sempre 38 giornate Serie A; usato per medie, tassi, varianza, confronti storici e calibrazione.
  - [ ] `current_league_horizon`: giornate selezionate nello slider; usato per asta, valore strategico della rosa e simulazione corrente.
- [ ] Verificare che nessun confronto con fonti storiche venga troncato in base allo slider della lega corrente.
- [ ] Derivare gli indici Serie A del `current_league_horizon` dal calendario corrente quando disponibile.
- [ ] Senza calendario di lega, usare il range selezionato per la proiezione strategica corrente, senza modificare i dati storici a 38 giornate.
- [ ] Esporre nei risultati quale orizzonte e' stato usato per ogni metrica: `storico 38`, `lega corrente N`.

## Selezione della formazione

- [ ] Definire la funzione obiettivo della formazione come punteggio individuale atteso piu' bonus difesa atteso quando il modificatore e' attivo.
- [ ] Applicare la stessa funzione obiettivo nel simulatore Python, browser mock e valutatore d'asta.
- [ ] Valutare tutte le formazioni consentite: un 4-3-3 o 4-4-2 puo' superare un 3-4-3 quando il bonus atteso compensa la differenza individuale.
- [ ] Conservare le attuali regole di panchina, sostituzioni per ruolo e limite globale.
- [ ] Esplicitare con test il comportamento di `Basic`, `Strict`, `None`, `zero_score`, `forfeit` e `allow_partial`.

## Modello marginale per asta e consigli

- [ ] Implementare nel Web Worker un valore marginale del modificatore, non una quotazione statica per giocatore.
- [ ] Per ogni candidato confrontare due scenari accoppiati:
  - [ ] rosa con candidato;
  - [ ] rosa con alternativa realistica dello stesso ruolo.
- [ ] Usare l'alternativa gia' individuata dal motore al cutoff di domanda di lega, evitando di confrontare con uno slot vuoto.
- [ ] Costruire completamenti plausibili della rosa incompleta dal pool residuo.
  - [ ] completamento di mercato;
  - [ ] completamento di maggior valore entro il budget;
  - [ ] completamento economico e fattibile;
  - [ ] completamento difensivo fattibile.
- [ ] Pesare i completamenti in base a fattibilita', budget e stato di avanzamento dell'asta.
- [ ] Per ogni completamento e giornata corrente:
  - [ ] scegliere XI e panchina;
  - [ ] estrarre presenze;
  - [ ] applicare sostituzioni;
  - [ ] estrarre voti puri;
  - [ ] applicare il modificatore canonico;
  - [ ] calcolare differenza candidato meno alternativa.
- [ ] Usare numeri casuali comuni nei due scenari per ridurre rumore Monte Carlo.
- [ ] Rendere il risultato deterministico con seed derivato da profilo, rosa, candidato, alternativa e contesto.
- [ ] Partire con quattro contesti e 128 campioni accoppiati; aumentare i campioni solo vicino a soglie o cap d'offerta.
- [ ] Memorizzare in cache proiezioni giornaliere, completamenti e valutazioni per non rallentare l'asta live.

## Integrazione nelle valutazioni

- [ ] Separare contributo individuale e contributo marginale del modificatore.
- [ ] Calcolare il margine corretto:

```text
margine corretto =
  contributo individuale candidato
  - contributo individuale alternativa
  + punti marginali attesi dal modificatore
```

- [ ] Usare il margine corretto nell'ordinamento delle alternative, nel vantaggio qualitativo e nel `valueCap` del consiglio.
- [ ] Non modificare la normalizzazione FVM sorgente nella prima versione.
- [ ] Non modificare automaticamente le percentuali di budget per ruolo nella prima versione.
- [ ] Convertire i punti marginali del modificatore in crediti con un prezzo-ombra per punto, stimato dal budget residuo e ristretto verso un prior di inizio asta.
- [ ] Applicare inflazione di ruolo una sola volta, evitando doppio conteggio tra prezzo di mercato e bonus difesa.
- [ ] Mantenere `legalMax`, riserva, cap morbido per ruolo e fattibilita' del completamento come vincoli finali.

## Priorita' e spiegazioni dei consigli

- [ ] Aggiungere una metrica `defenseReadiness` alla panoramica della rosa.
- [ ] Includere probabilita' di XI eleggibile, bonus medio condizionato, copertura in caso di assenze e probabilita' delle fasce.
- [ ] Aumentare la priorita' dei difensori quando il quarto titolare affidabile rende il reparto eleggibile.
- [ ] Aumentare la priorita' del portiere quando migliora in modo misurabile la probabilita' di fascia con i difensori posseduti.
- [ ] Ridurre la priorita' quando il rendimento marginale del reparto e' gia' basso.
- [ ] Mostrare nei consigli:
  - [ ] punti individuali marginali;
  - [ ] punti marginali del modificatore;
  - [ ] probabilita' di eleggibilita' prima/dopo;
  - [ ] probabilita' per fascia prima/dopo;
  - [ ] incertezza della stima;
  - [ ] ragione pratica, ad esempio: "quarto difensore titolare necessario".
- [ ] Segnalare quando il budget difesa configurato limita un acquisto strategicamente valido, senza aggirarlo automaticamente.

## Impostazioni: stato delle modifiche

- [ ] Correggere `mergeProfile()` affinche' conservi i valori salvati di `bench_switch`.
- [ ] Separare nello stato applicativo:
  - [ ] bozza del form;
  - [ ] profilo salvato sul server;
  - [ ] profilo applicato ai motori browser;
  - [ ] profilo e fonti usati dall'ultimo dataset;
  - [ ] profilo e dataset usati dall'ultima simulazione Monte Carlo.
- [ ] Fare in modo che `Salva profilo` esegua realmente `PUT /api/profiles/:id`.
- [ ] Non sostituire il profilo applicato in modo definitivo prima del successo del salvataggio o della generazione.
- [ ] Dopo generazione, usare il profilo effettivo restituito dal server, inclusi partecipanti derivati dal calendario.
- [ ] Estrarre una policy pura `profile-change-policy.js` che confronti baseline e bozza e classifichi ogni modifica.
- [ ] Trattare `fantasy_matchdays` come derivato, non come modifica indipendente.
- [ ] Conservare l'ordine semantico di moduli, tie-breaker, fasce, panchina e premi durante il confronto.

## Classificazione delle modifiche

- [ ] Classificare come `rigenerazione dataset necessaria`:
  - [ ] stagione, range e identita' del dataset;
  - [ ] fonti correnti e storiche;
  - [ ] contenuto di un file caricato anche se il percorso resta uguale;
  - [ ] partecipanti e calendario di lega;
  - [ ] valori di scoring che alimentano le proiezioni.
- [ ] Classificare come `nuova simulazione necessaria`:
  - [ ] modificatore difesa;
  - [ ] moduli, panchina e sostituzioni;
  - [ ] gol virtuali;
  - [ ] classifica, spareggi e premi;
  - [ ] quota di iscrizione;
  - [ ] gestione formazione incompleta;
  - [ ] slot rosa quando si aggiorna il report Monte Carlo.
- [ ] Classificare come `applicazione immediata`:
  - [ ] squadra utente;
  - [ ] crediti iniziali d'asta;
  - [ ] minimo, incremento, riserva e politica di chiamata;
  - [ ] budget per ruolo e flessibilita';
  - [ ] nome del profilo.
- [ ] Quando una modifica appartiene a piu' classi, mostrare l'azione piu' forte richiesta.

## Freschezza di dataset e simulazione

- [ ] Mantenere `configuration_hash` come identita' completa del profilo.
- [ ] Aggiungere `dataset_input_hash` con soli input che richiedono rigenerazione.
- [ ] Aggiungere `simulation_input_hash` con dataset, regole di simulazione e versione algoritmo.
- [ ] Calcolare impronte delle fonti usate in generazione: almeno dimensione, data modifica e SHA-256.
- [ ] Registrare nel dataset le impronte delle fonti, il profilo effettivo, hash, versione modello e identificativo generazione.
- [ ] Registrare nella simulazione hash dataset, hash simulazione, seed, iterazioni, data e versione simulatore.
- [ ] Rendere la sostituzione di un upload allo stesso percorso rilevabile come dataset obsoleto.
- [ ] Impedire o avvertire chiaramente la simulazione server contro un dataset non compatibile con profilo o fonti correnti.

## UX delle Impostazioni e dashboard

- [ ] Aggiungere un avviso persistente e non invasivo nella pagina Impostazioni.
- [ ] Elencare i campi che hanno generato l'avviso.
- [ ] Mostrare una delle tre azioni consigliate:
  - [ ] `Salva modifiche`;
  - [ ] `Salva e riesegui simulazione`;
  - [ ] `Salva e rigenera dati`.
- [ ] Consentire comunque il solo salvataggio, mantenendo lo stato di obsolescenza visibile.
- [ ] Resettare la baseline soltanto dopo successo dell'operazione richiesta.
- [ ] Mantenere lo stato sporco dopo errore di upload, salvataggio o generazione.
- [ ] Aggiungere conferma interna e `beforeunload` solo quando la bozza e' realmente sporca.
- [ ] Sostituire l'header sempre positivo `Dati aggiornati` con stati reali:
  - [ ] dataset corrente;
  - [ ] dataset da rigenerare;
  - [ ] fonti cambiate;
  - [ ] generazione in corso;
  - [ ] generazione fallita;
  - [ ] simulazione da aggiornare;
  - [ ] simulazione in corso;
  - [ ] simulazione non disponibile senza calendario.

## Test e calibrazione

- [x] Test Python per la semantica del modificatore: portiere, migliori tre, quinta scelta, fasce, soglie e formazione incompleta.
- [x] Test browser con gli stessi vettori di parita'.
- [ ] Test di valore marginale: candidato uguale all'alternativa, quarto difensore, quinto difensore, portiere, varianza, modificatore disattivato e formazione impossibile.
- [ ] Test del limite: il bonus puo' cambiare il consiglio ma mai superare vincoli legali o di completamento.
- [ ] Test di riproducibilita' a seed e rosa invariati.
- [ ] Test di classificazione di ogni categoria di impostazioni.
- [ ] Test che il ripristino di un valore elimini lo stato sporco.
- [ ] Test che un upload allo stesso percorso richieda rigenerazione.
- [ ] Test che una generazione fallita non dichiari aggiornato un dataset vecchio.
- [ ] Test che il report Monte Carlo sia marcato obsoleto dopo modifica delle sole regole di simulazione.
- [ ] Calibrare il worker contro il simulatore Python con rose sintetiche e seed condivisi.
- [ ] Misurare bias, errore standard, frequenze delle fasce e stabilita' della classifica dei candidati.

## Ordine di consegna

- [x] 1. Parita' del modificatore Python/browser e test di regressione.
- [ ] 2. Distinzione esplicita tra storico a 38 giornate e orizzonte corrente della lega.
- [ ] 3. Selezione formazione consapevole del modificatore.
- [ ] 4. Policy pura delle modifiche impostazioni e correzione del salvataggio profilo.
- [ ] 5. Hash, impronte fonti e stato di freschezza di dataset/simulazione.
- [ ] 6. Avvisi, CTA e badge nella UI.
- [ ] 7. Simulatore marginale accoppiato nel worker.
- [ ] 8. Integrazione nei cap, alternative, priorita' e spiegazioni dei consigli.
- [ ] 9. Calibrazione, test prestazionali e cache.
- [ ] 10. Aggiornamento opzionale dell'asta casuale per simulare avversari sensibili al modificatore.
