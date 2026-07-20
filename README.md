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

## 5. Deploy til Vercel

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
