# 🗡️ Grindborne — Documentazione tecnica

> _Trasforma la tua routine quotidiana in un'avventura epica._

**Grindborne** è un'app di produttività personale gamificata: traduce obiettivi, attività e pratica costante nel linguaggio di un RPG souls-like. Il suo scopo non è rendere la produttività un gioco superficiale, ma rendere la crescita visibile, misurabile e sostenibile.

Questa revisione separa ciò che il prodotto aspira a offrire da ciò che il backend TypeScript/Node espone effettivamente. La visione di prodotto resta quella originale: imparare dagli errori, riprovare con consapevolezza e coltivare le proprie capacità nel tempo.

---

## 📋 Indice

- [Panoramica](#-panoramica)
- [Concetti di dominio](#-concetti-di-dominio)
- [Architettura backend](#%EF%B8%8F-architettura-backend)
- [Processi applicativi](#%EF%B8%8F-processi-applicativi)
- [API e responsabilità](#-api-e-responsabilità)
- [Regole di business](#-regole-di-business)
- [Operatività e deployment](#-operatività-e-deployment)
- [Scalabilità e manutenzione](#-scalabilità-e-manutenzione)

---

## 🎯 Panoramica

### Perché Grindborne

Nella vita reale gli obiettivi non arrivano con una quest principale, un indicatore di livello o un feedback immediato. Si conosce spesso la direzione, ma non sempre si riesce a trasformarla in azione costante.

Grindborne affronta questo problema con un modello semplice:

| Vita reale            | Grindborne       |
| --------------------- | ---------------- |
| Attività singola      | Quest / Missione |
| Pratica ricorrente    | Grind            |
| Capacità personale    | Attributo        |
| Esperienza accumulata | XP               |
| Crescita misurabile   | Livello          |
| Perdita di costanza   | Decadimento      |

Il prodotto prende ispirazione dalla filosofia Soulsborne: un fallimento è informazione. Non è necessario "vincere sempre"; è necessario capire il proprio schema, modificare l'approccio e tornare a provarci.

### Obiettivi di prodotto

- Ridurre la distanza tra intenzione e azione.
- Rendere la crescita delle competenze concreta attraverso attributi e livelli.
- Premiare la costanza senza nascondere il costo dell'inattività.
- Evitare sistemi di produttività eccessivamente complessi o pieni di funzionalità scollegate.
- Offrire una base tecnica estendibile per client web, mobile e future integrazioni.

---

## 🧩 Concetti di dominio

### Entità principali

Il backend è organizzato attorno ai domini `auth`, `users`, `attributes` e `quests`. La presenza di job dedicati al decadimento e alla pulizia indica che la crescita del giocatore non è unicamente reattiva alle richieste HTTP: alcune regole vengono applicate periodicamente dal sistema.

| Concetto            | Responsabilità                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Utente**          | Proprietario dei dati, dell'identità applicativa e della progressione                                                                                                                                  |
| **Autenticazione**  | Gestione dell'accesso e dell'identità dell'utente autenticato                                                                                                                                          |
| **Attributo**       | Competenza configurabile dell'utente, associata a XP, livello e regole di mantenimento                                                                                                                 |
| **Quest**           | Attività orientata a un obiettivo, potenzialmente associata a uno o più attributi                                                                                                                      |
| **Grind**           | Abitudine ricorrente prevista dal prodotto; il relativo endpoint è presente nella struttura delle route, ma non risulta ancora un dominio backend implementato in modo equivalente a quest e attributi |
| **Job pianificato** | Processo server-side eseguito a intervalli regolari, indipendente dall'interazione dell'utente                                                                                                         |

### Diagramma di classe concettuale

![Concetti di dominio - diagramma di classe](./assets/Concetti%20di%20dominio%20diagramma%20di%20classe.svg)

### Ownership dei dati

Ogni risorsa di dominio deve appartenere a un singolo utente. Questa regola non è solo organizzativa: è una misura di sicurezza e privacy.

Un utente autenticato deve poter leggere, modificare o eliminare esclusivamente:

- il proprio profilo;
- i propri attributi;
- le proprie quest;
- le future entità Grind;
- i dati di progressione derivati dalle proprie attività.

L'identità dell'utente non deve essere accettata come parametro fidato dal client quando può essere ricavata dal token o dal contesto di autenticazione.

---

## 🏗️ Architettura backend

### Stack e struttura

Il backend è scritto in **TypeScript** per runtime **Node.js** e organizza il codice in livelli distinti. L'architettura evita che route HTTP, regole di business e persistenza convivano nello stesso file.

```text
src/
├── config/        Configurazione applicativa, database e costanti globali
├── controllers/   Traduzione tra HTTP e logica applicativa
├── jobs/          Processi pianificati: pulizia e decadimento
├── middlewares/   Cross-cutting concerns, inclusa autenticazione/gestione richieste
├── models/        Accesso e rappresentazione dei dati persistiti
├── routes/        Definizione degli endpoint HTTP
├── services/      Regole di business e orchestrazione dei casi d'uso
├── shared/        Elementi condivisi tra moduli
├── types/         Tipi TypeScript applicativi
├── utils/         Utility riusabili
└── index.ts       Bootstrap del server e composizione dell'applicazione
```

### Responsabilità per livello

| Livello    | Responsabilità                                                  | Non deve contenere                  |
| ---------- | --------------------------------------------------------------- | ----------------------------------- |
| Route      | Associare un endpoint a middleware e controller                 | Logica di business                  |
| Middleware | Autorizzazione, validazione trasversale, normalizzazione errori | Query di dominio specifiche         |
| Controller | Leggere input HTTP, invocare servizi, restituire risposta HTTP  | Calcoli di XP o query complesse     |
| Service    | Applicare invarianti e coordinare più operazioni                | Dipendenza diretta da `req` e `res` |
| Model      | Leggere e scrivere dati nel database                            | Decisioni di business               |
| Job        | Applicare regole periodiche in modo idempotente                 | Logica di presentazione             |
| Config     | Centralizzare integrazioni e parametri runtime                  | Regole del dominio                  |

### Diagramma dei componenti

![Architettura backend - diagramma dei componenti](./assets/Architettura%20backend%20diagramma%20dei%20componenti.svg)

### Principio guida

La richiesta HTTP deve restare sottile:

$$
\text{Route} \rightarrow \text{Middleware} \rightarrow \text{Controller} \rightarrow \text{Service} \rightarrow \text{Model}
$$

La stessa logica di business deve essere riusabile da controller e job. Per esempio, il decadimento di un attributo non deve essere implementato dentro una route: deve vivere in un servizio invocabile dal job pianificato.

---

## ⚙️ Processi applicativi

### Autenticazione

Il dominio `auth` è separato da `users` perché l'identità e il profilo hanno responsabilità differenti:

- `auth` gestisce la registrazione, il login e la verifica dell'identità;
- `users` gestisce le informazioni del profilo e le operazioni legate all'utente;
- i middleware proteggono gli endpoint che richiedono una sessione o un token valido.

![Processi applicativi - diagramma di sequenza](./assets/Diagramma%20di%20sequenza%20processi%20applicativi.svg)

### Gestione degli attributi

Gli attributi costituiscono il nucleo della progressione. Ogni operazione su di essi deve rispettare la proprietà del dato e preservare la coerenza tra XP, livello e stato di decadimento.

Flusso generale:

1. L'utente autenticato crea o aggiorna un attributo.
2. Il controller estrae l'identità autenticata e i dati validati della richiesta.
3. Il service verifica che l'attributo appartenga all'utente.
4. Il model esegue la lettura o la scrittura nel database.
5. Il service restituisce un risultato coerente con le regole del dominio.
6. Il controller produce una risposta HTTP esplicita.

![Gestione degli attributi - diagramma di attività](./assets/Gestione%20degli%20attributi%20diagramma%20di%20attività.svg)

### Quest e attribuzione della progressione

Le quest rappresentano attività puntuali. Il modulo dedicato deve concentrare l'intero ciclo di vita: creazione, lettura, modifica, completamento e gestione delle conseguenze sulla progressione.

Quando una quest influenza gli attributi, l'operazione deve essere trattata come un'unità logica:

1. verificare utente e proprietà della quest;
2. verificare lo stato corrente della quest;
3. calcolare l'eventuale progressione;
4. aggiornare quest e attributi coinvolti;
5. salvare tutto in modo atomico;
6. restituire lo stato finale.

![Gestione delle quest - diagramma di attività](./assets/Gestione%20delle%20quest%20diagramma%20di%20attività.svg)

### Decadimento degli attributi

Il decadimento evita che il livello comunichi una maestria immutabile. Una competenza coltivata cresce; una competenza ignorata può richiedere nuovo impegno.

Il backend include un job specifico per il decadimento degli attributi. Questo job deve essere progettato per essere:

- **deterministico**: a parità di dati produce lo stesso risultato;
- **idempotente**: una seconda esecuzione non deve applicare due volte lo stesso decadimento giornaliero;
- **osservabile**: deve produrre log utili per rilevare errori o volumi anomali;
- **scalabile**: deve poter elaborare attributi a batch, senza caricare l'intero dataset in memoria.

![Decadimento attributi - diagramma di attività](./assets/Decadimento%20attributi%20diagramma%20di%20attività.svg)

### Cleanup periodico

Il backend include inoltre un job di pulizia. Il suo obiettivo è rimuovere, archiviare o normalizzare dati non più utili secondo regole esplicite.

Le policy esatte devono restare configurabili e documentate prima di diventare distruttive. In particolare, una cancellazione definitiva richiede:

- criterio chiaro di eleggibilità;
- retention period;
- log o audit trail;
- possibilità di backup o recupero;
- esecuzione idempotente.

---

## 🌐 API e responsabilità

### Moduli esposti

| Modulo       | Stato nel backend                                        | Responsabilità                                   |
| ------------ | -------------------------------------------------------- | ------------------------------------------------ |
| `auth`       | Implementato                                             | Accesso e identità                               |
| `users`      | Implementato                                             | Profilo e risorse dell'utente                    |
| `attributes` | Implementato                                             | CRUD e logica della progressione degli attributi |
| `quests`     | Implementato                                             | Ciclo di vita delle quest                        |
| `grinds`     | Route presente, implementazione funzionale da completare | Abitudini ricorrenti e relativa progressione     |

### Convenzioni HTTP

La documentazione operativa degli endpoint deve essere mantenuta accanto alla codebase, idealmente tramite una collezione Postman e/o una specifica OpenAPI. Ogni endpoint deve definire:

- metodo e path;
- autenticazione richiesta;
- parametri di path, query e body;
- schema di successo;
- codici d'errore;
- esempi reali;
- side effect sul dominio;
- requisiti di idempotenza, quando applicabili.

### Risposte ed errori

Le risposte devono adottare una struttura stabile, in modo che il frontend possa distinguere dati, errori di validazione, assenza della risorsa e problemi inattesi.

| Categoria                   | Uso                                                         |
| --------------------------- | ----------------------------------------------------------- |
| `200 OK`                    | Lettura o modifica completata con successo                  |
| `201 Created`               | Nuova risorsa creata                                        |
| `204 No Content`            | Eliminazione riuscita senza body                            |
| `400 Bad Request`           | Input non valido o incompleto                               |
| `401 Unauthorized`          | Utente non autenticato                                      |
| `403 Forbidden`             | Utente autenticato ma non proprietario della risorsa        |
| `404 Not Found`             | Risorsa inesistente o non visibile all'utente               |
| `409 Conflict`              | Transizione di stato non consentita                         |
| `500 Internal Server Error` | Errore inatteso, senza dettagli sensibili esposti al client |

Esempio di errore normalizzato:

```json
{
  "error": {
    "code": "QUEST_NOT_COMPLETABLE",
    "message": "La quest non può essere completata nel suo stato attuale."
  }
}
```

---

## 📐 Regole di business

### Sistema dei livelli

Ogni attributo parte da un livello iniziale e contribuisce al livello complessivo del giocatore. La formula concettuale già definita dal prodotto è:

$$
\text{Livello giocatore} =
\sum_{i=1}^{n}\text{Livello attributo}_i - (n - 1)
$$

dove $n$ è il numero di attributi dell'utente.

Esempio:

| Attributo             | Livello |
| --------------------- | ------: |
| Forza                 |       4 |
| Intelligenza          |       3 |
| Carisma               |       7 |
| **Livello giocatore** |  **12** |

$$
4 + 3 + 7 - (3 - 1) = 12
$$

### Invarianti da preservare

- Un attributo non può appartenere a più utenti.
- Una quest non può aggiornare gli attributi di un altro utente.
- Un'operazione di completamento non deve assegnare XP duplicata.
- Una transizione di stato deve essere esplicita e verificabile.
- Un job di decadimento non deve applicare la stessa penalità più volte nello stesso intervallo.
- I dati sensibili di autenticazione non devono mai essere restituiti nelle risposte API.
- Le decisioni sul livello devono risiedere nel service layer, non nel frontend.

### Decisioni di prodotto

| Decisione                    | Motivazione                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Progressione per attributi   | La crescita reale è multidimensionale: una persona può migliorare in un'area senza crescere allo stesso ritmo in tutte le altre |
| Quest distinte dai Grind     | Un'attività una tantum e un'abitudine ricorrente hanno cicli di vita e metriche diverse                                         |
| Decadimento controllato      | Il sistema misura manutenzione della competenza, non un valore permanente acquisito una sola volta                              |
| Backend come fonte di verità | XP, livelli, autorizzazioni e stato delle quest non devono dipendere da calcoli del client                                      |
| Job server-side              | Le regole temporali devono continuare a funzionare anche quando l'utente non apre l'app                                         |

---

## 🚀 Operatività e deployment

### Configurazione

Il repository include un file `.env.example`: l'applicazione deve essere configurata tramite variabili d'ambiente e non tramite segreti inseriti nel codice.

Categorie minime di configurazione:

- connessione al database PostgreSQL;
- porta e ambiente applicativo;
- chiavi e durata dell'autenticazione;
- origine/i autorizzate per il client;
- pianificazione dei job;
- livelli di log;
- parametri delle politiche di decadimento e cleanup.

Non versionare mai un file `.env` contenente valori reali.

### Avvio dell'applicazione

Il bootstrap dell'applicazione avviene in `src/index.ts`. In un deployment affidabile, l'avvio deve rispettare questa sequenza:

![Avvio dell'applicazione - diagramma di attività](./assets/Avvio%20dell'applicazione%20diagramma%20di%20attività.svg)

### Checklist post-deploy

- Verificare che il database sia raggiungibile.
- Verificare la configurazione di CORS per il dominio del frontend.
- Testare registrazione, login e accesso a una route protetta.
- Verificare che un utente non possa accedere ai dati di un altro.
- Monitorare gli errori HTTP 5xx.
- Verificare l'esecuzione singola dei job schedulati.
- Verificare backup e strategia di ripristino del database.
- Controllare che non siano stati esposti segreti nei log, nelle variabili pubbliche o nel repository.

---

## 📈 Scalabilità e manutenzione

Ogni nuova funzionalità deve aggiornare nello stesso cambiamento:

- modello dati;
- tipi TypeScript;
- validazione input;
- service e invarianti;
- controller e route;
- documentazione API;
- test;
- eventuali job, metriche e log;
- questa documentazione architetturale, se modifica il dominio o i flussi.

In questo modo Grindborne conserva la propria lore tecnica: non solo _cosa_ fa il sistema, ma anche _perché_ lo fa e quali regole non devono essere spezzate.
