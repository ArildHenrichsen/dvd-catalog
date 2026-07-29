export type ThemeSource = "collection" | "tmdb" | "curated";

export type MovieTheme = {
  id: string;
  title: string;
  description: string;
  source: ThemeSource;

  collectionQuery?: {
    yearFrom?: number;
    yearTo?: number;
    minimumImdbScore?: number;
    maximumImdbScore?: number;
    requireSameDecade?: boolean;
    requireAtLeast?: number;
  };

  tmdbQuery?: {
    person?: string;
    personRole?: "actor" | "director";
    yearFrom?: number;
    yearTo?: number;
    genres?: string[]; // textual genres, lib/tmdb can map to ids or use as search hints
    keywords?: string[];
    query?: string; // free text search
    limit?: number;
  };

  curatedImdbIds?: string[];
};

export const THEMES: MovieTheme[] = [
  // --- Initial required themes (collection / tmdb / curated) ---
  {
    id: "peak-bruce-willis",
    title: "Peak Bruce Willis",
    description: "Bruce Willis fra perioden da hver arbeidsdag endte med eksplosjoner.",
    source: "tmdb",
    tmdbQuery: { person: "Bruce Willis", personRole: "actor", limit: 12 },
  },
  {
    id: "peak-sylvester-stallone",
    title: "Peak Sylvester Stallone",
    description: "Stallone i sin action- og dramaperiode.",
    source: "tmdb",
    tmdbQuery: { person: "Sylvester Stallone", personRole: "actor", limit: 12 },
  },
  {
    id: "peak-arnold-schwarzenegger",
    title: "Peak Arnold Schwarzenegger",
    description: "Klassisk action fra Arnie-perioden.",
    source: "tmdb",
    tmdbQuery: { person: "Arnold Schwarzenegger", personRole: "actor", limit: 12 },
  },
  {
    id: "peak-nicolas-cage",
    title: "Peak Nicolas Cage",
    description: "En blanding av intens skuespill og uforutsigbare valg.",
    source: "tmdb",
    tmdbQuery: { person: "Nicolas Cage", personRole: "actor", limit: 12 },
  },
  {
    id: "peak-clint-eastwood",
    title: "Peak Clint Eastwood",
    description: "Hardbarka helter og western-tilnærminger.",
    source: "tmdb",
    tmdbQuery: { person: "Clint Eastwood", personRole: "actor", limit: 12 },
  },
  {
    id: "peak-kurt-russell",
    title: "Peak Kurt Russell",
    description: "Tidløse action- og eventyrprestasjoner fra Kurt Russell.",
    source: "tmdb",
    tmdbQuery: { person: "Kurt Russell", personRole: "actor", limit: 12 },
  },
  {
    id: "peak-johnny-depp",
    title: "Peak Johnny Depp",
    description: "Excentrisk, ofte visuelt særpregede roller.",
    source: "tmdb",
    tmdbQuery: { person: "Johnny Depp", personRole: "actor", limit: 12 },
  },
  {
    id: "peak-jack-nicholson",
    title: "Peak Jack Nicholson",
    description: "Intense og ikoniske prestasjoner av Jack Nicholson.",
    source: "tmdb",
    tmdbQuery: { person: "Jack Nicholson", personRole: "actor", limit: 12 },
  },

  {
    id: "klassisk-80-tall",
    title: "Klassisk 80-tall",
    description: "Filmer fra 1980-tallet — neon, synth og stor dramatikk.",
    source: "collection",
    collectionQuery: { yearFrom: 1980, yearTo: 1989 },
  },
  {
    id: "klassisk-90-tall",
    title: "Klassisk 90-tall",
    description: "90-tallsklassikere — fra indie til blockbuster.",
    source: "collection",
    collectionQuery: { yearFrom: 1990, yearTo: 1999 },
  },
  {
    id: "cheesy-skrekk",
    title: "Cheesy skrekk",
    description: "Skrekk med sjarmerende lave budsjetter og høyt underholdningsnivå.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "cheesy-action",
    title: "Cheesy action",
    description: "Actionfilmer med store stunts og små logiske hull.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "so-bad-its-good",
    title: "So bad it's good",
    description: "Filmer som er underholdende fordi de er uventet dårlige.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "spionfilmer",
    title: "Spionfilmer",
    description: "Intriger, hemmelige agenter og internasjonal spenning.",
    source: "tmdb",
    tmdbQuery: { query: "spy", keywords: ["spy", "espionage"], genres: ["Thriller", "Action"], limit: 12 },
  },
  {
    id: "dystopisk",
    title: "Dystopisk",
    description: "Mørke framtidsvisjoner og samfunnskritiske historier.",
    source: "tmdb",
    tmdbQuery: { query: "dystopian", keywords: ["dystopia", "post-apocalyptic"], genres: ["Science Fiction", "Drama"], limit: 12 },
  },
  {
    id: "verdensrommet",
    title: "Verdensrommet",
    description: "Sci-fi satt i verdensrommet — utforskning, isolasjon og fare.",
    source: "tmdb",
    tmdbQuery: { query: "space", keywords: ["space", "space opera"], genres: ["Science Fiction", "Adventure"], limit: 12 },
  },
  {
    id: "buddy-komedie",
    title: "Buddy-komedie",
    description: "To (eller flere) partnere som krangler seg gjennom eventyret.",
    source: "tmdb",
    tmdbQuery: { keywords: ["buddy", "buddy comedy"], genres: ["Comedy"], limit: 12 },
  },
  {
    id: "actionkomedie",
    title: "Actionkomedie",
    description: "Action møter humor — eksplosjoner og quips.",
    source: "tmdb",
    tmdbQuery: { keywords: ["action comedy"], genres: ["Action", "Comedy"], limit: 12 },
  },
  {
    id: "krigsfilmer",
    title: "Krigsfilmer",
    description: "Frontlinjer, taktikk og menneskelige historier fra krig.",
    source: "tmdb",
    tmdbQuery: { genres: ["War", "Drama"], keywords: ["war", "military"], limit: 12 },
  },
  {
    id: "superheltfilmer",
    title: "Superheltfilmer",
    description: "Kappehelter, moralske valg og stor action.",
    source: "tmdb",
    tmdbQuery: { query: "superhero", keywords: ["superhero"], genres: ["Action", "Adventure"], limit: 12 },
  },
  {
    id: "regissor-fokus",
    title: "Filmer fra en bestemt regissør",
    description: "Temafilmer satt rundt verk av en regissør (f.eks. Tarantino, Spielberg).",
    source: "tmdb",
    tmdbQuery: { personRole: "director", limit: 12 },
  },
  {
    id: "sjanger-person-nokkelord",
    title: "Sjanger / person / nøkkelord",
    description: "Temaer bygget på kombinasjoner av sjanger, personer og nøkkelord.",
    source: "tmdb",
    tmdbQuery: { limit: 12 },
  },
  {
    id: "praktiske-effekter",
    title: "Praktiske effekter",
    description: "Filmer kjent for praktiske effekter og praktisk stuntarbeid.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "kultklassikere",
    title: "Kultklassikere",
    description: "Filmer med kultstatus, kanskje ikke alltid kritikerrost.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "en-mann-mot-alle",
    title: "Én mann mot alle",
    description: "Historier om en enkelt helt mot en overveldende styrke.",
    source: "tmdb",
    tmdbQuery: { keywords: ["one man army", "lone hero"], genres: ["Action", "Thriller"], limit: 12 },
  },
  {
    id: "mennesket-mot-maskinen",
    title: "Mennesket mot maskinen",
    description: "Konflikter mellom menneske og teknologi/AI/robotikk.",
    source: "tmdb",
    tmdbQuery: { keywords: ["robot", "ai", "android"], genres: ["Science Fiction", "Thriller"], limit: 12 },
  },
  {
    id: "fanget-paa-ett-sted",
    title: "Fanget på ett sted",
    description: "Klaustrofobiske filmer hvor handlingen foregår på ett sted.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "tidsreise-med-konsekvenser",
    title: "Tidsreise med konsekvenser",
    description: "Tidsreiser som endrer skjebner — moralske og narrative konsekvenser.",
    source: "tmdb",
    tmdbQuery: { keywords: ["time travel", "temporal"], genres: ["Science Fiction", "Drama"], limit: 12 },
  },

  // --- 30 ekstra temaer (romantikk, thriller/drama, historie, dokumentar, mysterie, fantasy etc.) ---
  {
    id: "romantic-period",
    title: "Romantikk fra en annen tid",
    description: "Kostyme- og periode-romantikk — hoff, viktoriansk eller tidlig 1900-tall.",
    source: "tmdb",
    tmdbQuery: { query: "period romance", keywords: ["costume", "period"], yearFrom: 1800, yearTo: 1950, limit: 10 },
  },
  {
    id: "modern-romcom",
    title: "Moderne romantiske komedier",
    description: "Lett og varm rom-com fra 90-tallet og nyere.",
    source: "tmdb",
    tmdbQuery: { genres: ["Comedy", "Romance"], yearFrom: 1990, limit: 12 },
  },
  {
    id: "romantic-drama",
    title: "Hjerte og smerte — romantisk drama",
    description: "Dype følelsesfilmer med konflikter, brudd eller tragisk kjærlighet.",
    source: "tmdb",
    tmdbQuery: { genres: ["Drama", "Romance"], limit: 12 },
  },
  {
    id: "love-triangle",
    title: "Kjærlighetstriangel",
    description: "Trekanthistorier hvor forhold og lojalitet utfordres.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "slow-burn-romance",
    title: "Slow-burn-romantikk",
    description: "Filmer som bygger langsomt opp en intens følelsesmessig forbindelse.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "romantic-comedies-classics",
    title: "Romantiske klassikere",
    description: "Tidløse rom-coms (før 1990).",
    source: "collection",
    collectionQuery: { yearFrom: 1900, yearTo: 1989, minimumImdbScore: 6 },
  },
  {
    id: "psychological-thriller",
    title: "Psykologisk thriller",
    description: "Nerveskjærende, cerebral spenning og uventede vendinger.",
    source: "tmdb",
    tmdbQuery: { genres: ["Thriller"], keywords: ["psychological", "mind-bending"], limit: 12 },
  },
  {
    id: "neo-noir",
    title: "Neo-noir & mørke kriminaldramaer",
    description: "Mørk estetikk, antihelter og kompliserte forbrytelser.",
    source: "tmdb",
    tmdbQuery: { keywords: ["neo-noir", "noir", "crime"], genres: ["Crime", "Drama"], limit: 12 },
  },
  {
    id: "revenge-thrillers",
    title: "Hevn-thrillere",
    description: "Karakterdrevet hevnhistorier med høy intensitet.",
    source: "tmdb",
    tmdbQuery: { keywords: ["revenge", "vengeance"], genres: ["Thriller"], limit: 10 },
  },
  {
    id: "courtroom-drama",
    title: "Rettssal-dramaer",
    description: "Domstolsspenn og moralske dilemmaer.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "family-drama",
    title: "Familiens byrder",
    description: "Intime historier om familie, arv og forhold.",
    source: "collection",
    collectionQuery: { minimumImdbScore: 6, yearFrom: 1950, yearTo: new Date().getFullYear() },
  },
  {
    id: "historical-epic",
    title: "Historiske epos",
    description: "Storslåtte periodedramaer, krigsepos og storfilm-historier.",
    source: "tmdb",
    tmdbQuery: { genres: ["History", "Drama"], keywords: ["epic", "historical"], limit: 10 },
  },
  {
    id: "ww2-films",
    title: "Andre verdenskrig",
    description: "Filmer satt under eller om 2. verdenskrig — fra fronten til hjemmekontoret.",
    source: "collection",
    collectionQuery: { yearFrom: 1935, yearTo: 1950 },
  },
  {
    id: "historical-biopic",
    title: "Biografiske historiefilmer",
    description: "Filmer basert på virkelige personer og hendelser.",
    source: "tmdb",
    tmdbQuery: { keywords: ["biographical", "biopic"], genres: ["Drama"], limit: 12 },
  },
  {
    id: "nature-documentary",
    title: "Naturdokumentarer",
    description: "Storslåtte naturfilmer eller dyredokumentarer.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "true-crime-doc",
    title: "True crime-dokumentarer",
    description: "Undersøkende dokumentarer om virkelige forbrytelser.",
    source: "tmdb",
    tmdbQuery: { genres: ["Documentary"], keywords: ["true crime", "crime documentary"], limit: 12 },
  },
  {
    id: "political-documentary",
    title: "Politikk og samfunn — dokumentar",
    description: "Dypdykk i makt, politikk eller samfunnsfenomener.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "investigative-doc",
    title: "Granskende dokumentarer",
    description: "Etterforskende journalistikk på filmformat.",
    source: "tmdb",
    tmdbQuery: { genres: ["Documentary"], keywords: ["investigation", "journalism"], limit: 12 },
  },
  {
    id: "whodunit-mystery",
    title: "Klassisk whodunit",
    description: "Mysterier med ledetråder, mystiske mord og en løsning på slutten.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "noir-mystery",
    title: "Mørkt mysterium",
    description: "Mørke, regnvåte gater og moralens gråsoner — krimgåter i noir-stil.",
    source: "tmdb",
    tmdbQuery: { keywords: ["mystery", "noir"], genres: ["Crime", "Mystery", "Drama"], limit: 12 },
  },
  {
    id: "locked-room-mystery",
    title: "Låst rom / klaustrofobisk mysterium",
    description: "Små settinger, intense mistenkte og puslespill-løsninger.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "gothic-mystery",
    title: "Gammel gotisk mystikk",
    description: "Gotisk stemning — slott, hemmeligheter og overtro.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "high-fantasy",
    title: "Høyfantasy & episk magi",
    description: "Verdensbygging, magi og heltereiser.",
    source: "tmdb",
    tmdbQuery: { genres: ["Fantasy", "Adventure"], keywords: ["high fantasy", "epic fantasy"], limit: 12 },
  },
  {
    id: "urban-fantasy",
    title: "Urban fantasy",
    description: "Magi i moderne bymiljø — vampyrer, hekseri, skjulte samfunn.",
    source: "tmdb",
    tmdbQuery: { keywords: ["urban fantasy", "supernatural"], genres: ["Fantasy", "Mystery"], limit: 12 },
  },
  {
    id: "dark-fantasy",
    title: "Mørk fantasy",
    description: "Grim, voksen fantasy — moralgrumset, ofte visuelt tung.",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "myth-legend",
    title: "Myter og legender",
    description: "Filmer basert på mytologi, folklore eller eldgamle sagn.",
    source: "tmdb",
    tmdbQuery: { keywords: ["mythology", "legend"], genres: ["Fantasy", "Adventure"], limit: 12 },
  },
  {
    id: "fantasy-adventure",
    title: "Fantasi & eventyr",
    description: "Lettere, eventyrpregede fantasyfilmer — skattejakter og reiser.",
    source: "collection",
    collectionQuery: { yearFrom: 1970, minimumImdbScore: 5 },
  },
  {
    id: "coming-of-age-mystery",
    title: "Ungdom, oppvekst og mysterier",
    description: "Voksesmerter + et underliggende mysterium (unge protagonister og gåter).",
    source: "curated",
    curatedImdbIds: [],
  },
  {
    id: "romantic-thriller",
    title: "Kjærlighet i fare — romantic thriller",
    description: "Romantikk blandet med fare, bedrag eller konspirasjon.",
    source: "tmdb",
    tmdbQuery: { genres: ["Thriller", "Romance"], keywords: ["romantic thriller"], limit: 12 },
  },
  {
    id: "fantasy-folklore",
    title: "Folkeeventyr og magisk realisme",
    description: "Filmer som blandes mellom folklore, magisk realisme og symbolikk.",
    source: "curated",
    curatedImdbIds: [],
  },
];
