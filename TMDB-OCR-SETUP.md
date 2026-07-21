# TMDB og coveranalyse

## Ny miljøvariabel

Opprett en TMDB-konto, be om API-tilgang og kopier "API Read Access Token".

Legg dette til i `.env.local` og i Vercel Environment Variables:

```env
TMDB_READ_ACCESS_TOKEN=din_tilgangstoken
```

Start lokalserveren på nytt etter endringen. Redeploy Vercel etter at variabelen er lagt inn.

## Bruk

1. Åpne «Legg til DVD» eller «Legg til ønske».
2. Last opp eller ta bilde av coveret.
3. Trykk «Analyser cover».
4. Korriger OCR-forslaget ved behov og søk.
5. Velg «Bruk» på riktig film.
6. Kontroller feltene og lagre.

OCR og TMDB gir forslag, ikke autoritative data. IMDb-score fylles fortsatt manuelt.
