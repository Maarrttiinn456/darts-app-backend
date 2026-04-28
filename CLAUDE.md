# Šipkařská aplikace — Backend

## Co stavíme

REST API pro šipkařskou aplikaci s realtime SSE podporou.
Organizační struktura: **Liga → Turnaj → Hra**.

---

## Tech stack

- TypeScript
- Express
- Neon (PostgreSQL)
- Drizzle ORM
- Zod — validace requestů + generování OpenAPI schématu
- SSE (Server-Sent Events) — realtime aktualizace skóre

---

## Struktura projektu

```
src/
├── db/
│   ├── schema.ts          # Drizzle schéma — source of truth
│   ├── index.ts           # připojení k Neon DB
│   └── migrations/        # generované migrace (nikdy needituj ručně)
├── routes/
│   ├── auth.ts
│   ├── leagues.ts
│   ├── tournaments.ts
│   ├── games.ts
│   └── scores.ts
├── middleware/
│   ├── auth.ts            # JWT ověření
│   └── errors.ts          # globální error handler
├── sse/
│   └── manager.ts         # správa SSE připojení per game
├── lib/
│   └── openapi.ts         # OpenAPI schéma generátor
└── index.ts               # entry point, Express setup
```

---

## Databázové schéma

Tabulky (snake_case):

```
user
league
league_member
tournament
game
game_score
```

### Klíčová pravidla schématu

- Všechny primární klíče jsou `uuid` — nikdy `integer` auto-increment
- Každá tabulka má `created_at timestamp` (kromě `game_score` která má `updated_at`)
- `game_score` má vždy jeden řádek per hráč per hra — vzniká automaticky při vytvoření hry
- `league_member` je uzamčena po vytvoření ligy — nikdy nepřidávej endpoint pro INSERT do této tabulky po jejím založení

---

## API endpointy

### Auth

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### Ligy

```
GET    /api/leagues
POST   /api/leagues
GET    /api/leagues/:leagueId
```

### Turnaje

```
GET    /api/leagues/:leagueId/tournaments
POST   /api/leagues/:leagueId/tournaments
GET    /api/tournaments/:tournamentId
```

### Hry

```
GET    /api/tournaments/:tournamentId/games
POST   /api/tournaments/:tournamentId/games
GET    /api/games/:gameId
PATCH  /api/games/:gameId/finish
```

### Skóre

```
GET    /api/games/:gameId/scores
PATCH  /api/games/:gameId/scores/:userId
```

### SSE

```
GET    /api/games/:gameId/stream
```

---

## Klíčová pravidla

1. **Schéma je source of truth** — změny vždy začínají v `db/schema.ts`, pak generuješ migraci přes `drizzle-kit generate`.
2. **Nikdy needituj migrace ručně** — vždy generuj přes Drizzle Kit.
3. **Validace přes Zod** — každý request body musí mít Zod schéma, nikdy nedůvěřuj raw `req.body`.
4. **Skórování je manuální** — žádná herní logika (pravidla 301/501), jen ukládání N bodů per hráč.
5. **Při vytvoření hry** — automaticky vytvoř `game_score` záznamy pro všechny hráče ligy (points: 0).
6. **Nová hra v turnaji** — před vytvořením zkontroluj že předchozí hra má `is_finished: true`.
7. **Liga uzamčena** — endpoint pro přidání členů do ligy neexistuje. Členové se nastaví pouze při vytvoření ligy.
8. **SSE per hra** — po každém PATCH na skóre rozešli event všem připojeným klientům dané hry.

---

## SSE manager

```ts
// Vzor pro SSE manager
const clients = new Map<string, Set<Response>>(); // gameId → Set of responses

export function addClient(gameId: string, res: Response) {
    if (!clients.has(gameId)) clients.set(gameId, new Set());
    clients.get(gameId)!.add(res);
}

export function broadcast(gameId: string, data: object) {
    clients.get(gameId)?.forEach((res) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

export function removeClient(gameId: string, res: Response) {
    clients.get(gameId)?.delete(res);
}
```

---

## OpenAPI

Backend generuje OpenAPI schéma na `/api-docs`. Frontend z něj generuje TypeScript typy.

```ts
// Po každé změně API spusť na frontendu:
// npx openapi-typescript http://localhost:3000/api-docs -o src/types/api.ts
```

Každý endpoint musí být zdokumentován v OpenAPI schématu — jinak frontend nemá aktuální typy.

---

## Konvence

- Komentáře a názvy proměnných: **anglicky**
- Drizzle schéma: snake_case názvy sloupců
- API responses: camelCase JSON (Drizzle to převádí automaticky)
- Chybové odpovědi: `{ error: string, code?: string }`
- HTTP status kódy: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
- JWT v `Authorization: Bearer <token>` headeru
