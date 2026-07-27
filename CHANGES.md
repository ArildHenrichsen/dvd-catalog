# Forbedret coveranalyse

- Google Web Detection og direkte IMDb/TMDB-lenker prioriteres foran OCR.
- OCR er redusert til et støttesignal og kan ikke lenger dominere trefflisten alene.
- Typiske to-ords personnavn filtreres når de ikke støttes av webtreffene.
- Bilder normaliseres før analyse for å redusere rotasjon, størrelse og transparent støy.
- Kandidatfilmer sammenlignes visuelt med TMDB-plakatene ved hjelp av en lokal perceptual hash.
- Kandidater med svak samlet evidens filtreres bort i stedet for å vises som tilsynelatende gode treff.
- Ny `getTmdbMovieById()` støtter direkte TMDB-lenker fra sider med matchende bilder.

Ingen databaseendring eller nye miljøvariabler er nødvendig. `sharp` må allerede være installert fra thumbnail-oppdateringen.
