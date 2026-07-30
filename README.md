# DVD-samlingen v1

Mobilvennlig Next.js-app for en privat DVD-samling.

## 1. Opprett Supabase

1. Opprett et Supabase-prosjekt.
2. Åpne SQL Editor og kjør `supabase/migrations/001_initial.sql`.
3. Finn Project URL og en server-side Secret key under API Keys.

## 2. Miljøvariabler

Kopier `.env.example` til `.env.local` og fyll inn verdiene.

`APP_WRITE_TOKEN` er passordet du skriver på `/unlock` for å aktivere skriveoperasjoner i nettleseren. Bruk minst 24 tilfeldige tegn.

## 3. Lokal kjøring

```bash
npm install
npm run dev
```

Åpne `http://localhost:3000`, gå til `/unlock`, og skriv inn `APP_WRITE_TOKEN`.

## 4. Tester og bygg

```bash
npm test
npm run build
```

## 5. Automatisk metadata-berikelse

Appen støtter automatisk berikelse av filmmetadata via TMDB.

- Konfigurasjon:
  - `TMDB_READ_ACCESS_TOKEN` må være satt i miljøvariabler.
- Opprett/rediger:
  - Når du velger en film fra coveranalyse eller manuelt søk, lagres TMDB-kilde-ID-en i skjemaet.
  - Ved lagring fylles manglende metadata automatisk inn uten å overskrive manuelle felt.
  - På redigeringssiden kan du bruke **Fyll inn manglende metadata** for å hente forslag og se diff før du bruker dem.
- Adminverktøy:
  - Gå til `/settings` → **Åpne metadata-verktøy**.
  - Velg **Kun manglende felt**, **Dry-run** og ønsket batchstørrelse før du starter.
  - Resultatet viser behandlet/oppdatert/hoppet over/feilet og tekniske feil per DVD.
- Eksisterende CLI for nøkkelord:
  ```bash
  npm run enrich-keywords
  ```
- Ekstra flagg:
  - `--force` tvinger oppdatering av alle filmer
  - `--stale-days=30` styrer hvor gammel data kan være før refresh

Beriket metadata lagres lokalt i databasen (`overview`, `runtime_minutes`, `genres`, `auto_keywords`) sammen med kilde/proveniens (`metadata_provider`, `metadata_provider_id`, `metadata_last_enriched_at`) og i en lokal cache-tabell (`movie_metadata_cache`) slik at anbefalinger ikke avhenger av live API-kall.

## 6. Manuelle nøkkelord (override)

På opprett/rediger-siden for en film finnes feltet **Manuelle nøkkelord (kommaseparert)**.

- Manuelle nøkkelord lagres i `manual_keywords`.
- Effektive nøkkelord bygges av manuelle + automatiske nøkkelord, med manuelle først/prioritert.
- Hvis automatisk berikelse mangler eller API er utilgjengelig, fortsetter appen med manuelle nøkkelord og eksisterende logikk.

## 7. Diversitet i filmkveld-forslag

Forslagsmotoren roterer mer aktivt ved å:

- straffe nylig foreslåtte filmer (`last_suggested_at`, `times_suggested`)
- straffe temaer og nøkkelord som er brukt mye nylig (`movie_night_history`)
- belønne filmer/nøkkelord som er underrepresentert
- velge filmpar med intern diversitet (unngår nesten-identiske forslag)

`curatedImdbIds` oppfører seg fortsatt som før for tematreff, men utvalg innen treffene diversifiseres.

## 8. Deploy til Vercel

1. Push prosjektet til et Git-repository.
2. Importer repositoryet i Vercel.
3. Legg inn alle variablene fra `.env.example` under Project Settings → Environment Variables.
4. Deploy.
5. Kjør Supabase-migrasjonen separat før appen tas i bruk.

## Kjente begrensninger

- Lesetilgang er offentlig for alle som kjenner URL-en.
- Skrivetoken er et v1-kompromiss, ikke full brukerautentisering.
- Bilder valideres og begrenses, men komprimeres foreløpig ikke i nettleseren.
- Duplisering peker til samme coverfil. Sletting av én kopi kan derfor fjerne coveret for den andre. Dette må løses med filkopiering eller referansetelling før funksjonen brukes tungt.
- TMDB, OCR, samlebokser og diskmodell er ikke med i denne milepælen.
