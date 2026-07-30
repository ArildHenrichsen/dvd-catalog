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
    curatedImdbIds: [
      "tt0083907", // The Evil Dead (1981)
      "tt0092991", // Evil Dead II (1987)
      "tt0103723", // Leprechaun (1993)
      "tt0089885", // Re-Animator (1985)
      "tt0084528", // Basket Case (1982)
      "tt0091076", // Night of the Creeps (1986)
      "tt0091225", // Howard the Duck (1986) (borderline-cheesy)
      "tt0090310", // Troll (1986)
    ],
  },
  {
    id: "cheesy-action",
    title: "Cheesy action",
    description: "Actionfilmer med store stunts og små logiske hull.",
    source: "curated",
    curatedImdbIds: [
      "tt0088944", // Commando (1985)
      "tt0092099", // The Delta Force (1986)
      "tt0093437", // Road House (1989)
      "tt0073195", // Death Wish (1974)
      "tt0095016", // Die Hard (1988) - inkluder som populær action
      "tt0103064", // Terminator 2: Judgment Day (1991)
    ],
  },
  {
    id: "so-bad-its-good",
    title: "So bad it's good",
    description: "Filmer som er underholdende fordi de er uventet dårlige.",
    source: "curated",
    curatedImdbIds: [
      "tt0368226", // The Room (2003)
      "tt0045076", // Plan 9 from Outer Space (1959)
      "tt0091225", // Howard the Duck (1986)
      "tt0090310", // Troll (1986)
      "tt0114436", // Showgirls (1995)
    ],
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
    curatedImdbIds: [
      "tt0084787", // The Thing (1982)
      "tt0078748", // Alien (1979)
      "tt0076759", // Star Wars: Episode IV - A New Hope (1977)
      "tt0082971", // Raiders of the Lost Ark (1981)
      "tt0082694", // Mad Max 2 (The Road Warrior) (1981)
      "tt0092099", // The Delta Force (1986) - some practical stunts
    ],
  },
  {
    id: "kultklassikere",
    title: "Kultklassikere",
    description: "Filmer med kultstatus, kanskje ikke alltid kritikerrost.",
    source: "curated",
    curatedImdbIds: [
      "tt0110912", // Pulp Fiction (1994)
      "tt0137523", // Fight Club (1999)
      "tt0118715", // The Big Lebowski (1998)
      "tt0246578", // Donnie Darko (2001)
      "tt0088258", // This Is Spinal Tap (1984)
    ],
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
    curatedImdbIds: [
      "tt1462758", // Buried (2010)
      "tt0123755", // Cube (1997)
      "tt0050083", // 12 Angry Men (1957)
      "tt0037076", // Lifeboat (1944)
      "tt0204946", // Phone Booth (2002)
    ],
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
    curatedImdbIds: [
      "tt0061729", // The Graduate (1967)
      "tt0120338", // Titanic (1997)
      "tt0376541", // Closer (2004)
      "tt0364751", // Vicky Cristina Barcelona (2008)
    ],
  },
  {
    id: "slow-burn-romance",
    title: "Slow-burn-romantikk",
    description: "Filmer som bygger langsomt opp en intens følelsesmessig forbindelse.",
    source: "curated",
    curatedImdbIds: [
      "tt0112471", // Before Sunrise (1995)
      "tt0183523", // Before Sunset (2004)
      "tt0335266", // Lost in Translation (2003)
      "tt0118694", // In the Mood for Love (2000)
    ],
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
    curatedImdbIds: [
      "tt0104257", // A Few Good Men (1992)
      "tt0056592", // To Kill a Mockingbird (1962)
      "tt0091530", // The Verdict (1982)
      "tt0050083", // 12 Angry Men (1957)
    ],
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
    curatedImdbIds: [
      "tt0428803", // March of the Penguins (2005)
      "tt0363589", // Winged Migration (2001)
      "tt0085809", // Koyaanisqatsi (1982)
    ],
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
    curatedImdbIds: [
      "tt0317910", // The Fog of War (2003)
      "tt1645089", // Inside Job (2010)
      "tt3522806", // Citizenfour (2014)
    ],
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
    curatedImdbIds: [
      "tt0071877", // Murder on the Orient Express (1974)
      "tt0088939", // Clue (1985)
      "tt0175880", // Gosford Park (2001)
      "tt8946378", // Knives Out (2019)
    ],
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
    curatedImdbIds: [
      "tt0123755", // Cube (1997)
      "tt1462758", // Buried (2010)
      "tt1242432", // Exam (2009)
      "tt0037076", // Lifeboat (1944)
    ],
  },
  {
    id: "gothic-mystery",
    title: "Gammel gotisk mystikk",
    description: "Gotisk stemning — slott, hemmeligheter og overtro.",
    source: "curated",
    curatedImdbIds: [
      "tt0230600", // The Others (2001)
      "tt0032976", // Rebecca (1940)
      "tt2554274", // Crimson Peak (2015)
    ],
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
    curatedImdbIds: [
      "tt0457430", // Pan's Labyrinth (2006)
      "tt0060827", // The Wicker Man (1973)
      "tt0091369", // Legend (1985)
    ],
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
    curatedImdbIds: [
      "tt0092005", // Stand by Me (1986)
      "tt0120268", // The Virgin Suicides (1999)
      "tt0118799", // The Mighty (1998)
    ],
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
    curatedImdbIds: [
      "tt0096283", // My Neighbor Totoro (1988)
      "tt0245429", // Spirited Away (2001)
      "tt0457430", // Pan's Labyrinth (2006)
    ],
  },
];
