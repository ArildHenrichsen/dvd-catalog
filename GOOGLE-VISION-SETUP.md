# Visuell covergjenkjenning

Appen bruker Google Cloud Vision Web Detection på serversiden og normaliserer treffene mot TMDB.

## Google Cloud

1. Opprett eller velg et Google Cloud-prosjekt.
2. Aktiver **Cloud Vision API**.
3. Opprett en API-nøkkel under **APIs & Services → Credentials**.
4. Begrens nøkkelen til **Cloud Vision API**. Ikke legg nøkkelen i klientkode.
5. Legg til miljøvariabelen lokalt og i Vercel:

```env
GOOGLE_VISION_API_KEY=...
```

Behold også:

```env
TMDB_READ_ACCESS_TOKEN=...
```

Google Cloud krever vanligvis aktiv fakturering selv om den månedlige gratiskvoten kan dekke privat bruk. Sett opp budsjettvarsler og API-kvoter. Et budsjettvarsel er ikke en absolutt kostnadssperre.

## Flyt

- Brukeren tar eller laster opp et cover først.
- `/api/movies/analyze-cover` sender bildet til Vision Web Detection.
- Direkte IMDb-treff og visuelle web-entiteter søkes opp i TMDB.
- Treffene vises som forslag og må godkjennes manuelt.

Visuell Web Detection er ikke identisk med Google Lens. Treffkvaliteten varierer, og manuelt TMDB-søk beholdes som fallback.
