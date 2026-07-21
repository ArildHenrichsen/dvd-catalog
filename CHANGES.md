# TMDB-cover fra forslag

- Når brukeren velger «Bruk» på et filmforslag, spør appen om TMDB-coveret også skal brukes.
- Ved ja hentes bildet serverside, valideres og lagres i privat Supabase Storage.
- Skjemaets coversti og forhåndsvisning oppdateres før lagring.
- Ved nei brukes bare metadataene.
