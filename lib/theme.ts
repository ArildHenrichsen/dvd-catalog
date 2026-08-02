export type ThemeSource = "collection" | "tmdb";

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
    genres?: string[]; // TMDB genres. At least one must match unless requireAllGenres is true.
    requireAllGenres?: boolean;
    keywords?: string[]; // At least one keyword must match when provided.
    query?: string; // free text search
    limit?: number;
  };
};

export const THEMES: MovieTheme[] = [
  // --- Initial required themes (collection / tmdb) ---
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
    source: "tmdb",
    tmdbQuery: { query: "campy horror", keywords: ["camp", "cult horror", "b-movie"], genres: ["Horror"], yearFrom: 1970, limit: 14 },
  },
  {
    id: "cheesy-action",
    title: "Cheesy action",
    description: "Actionfilmer med store stunts og små logiske hull.",
    source: "tmdb",
    tmdbQuery: { query: "campy action", keywords: ["one liner", "explosion", "cult action"], genres: ["Action"], yearFrom: 1970, limit: 14 },
  },
  {
    id: "so-bad-its-good",
    title: "So bad it's good",
    description: "Filmer som er underholdende fordi de er uventet dårlige.",
    source: "tmdb",
    tmdbQuery: { query: "cult bad movie", keywords: ["cult film", "b-movie", "so bad it's good"], genres: ["Comedy", "Horror"], limit: 14 },
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
    tmdbQuery: { keywords: ["action comedy"], genres: ["Action", "Comedy"], requireAllGenres: true, limit: 12 },
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
    source: "tmdb",
    tmdbQuery: { query: "practical effects", keywords: ["practical effects", "animatronics", "stunt"], genres: ["Action", "Science Fiction", "Horror"], limit: 12 },
  },
  {
    id: "kultklassikere",
    title: "Kultklassikere",
    description: "Filmer med kultstatus, kanskje ikke alltid kritikerrost.",
    source: "tmdb",
    tmdbQuery: { keywords: ["cult film", "cult classic"], limit: 14 },
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
    source: "tmdb",
    tmdbQuery: { keywords: ["single location", "contained thriller", "claustrophobic"], genres: ["Thriller", "Drama", "Mystery"], limit: 12 },
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
    tmdbQuery: { genres: ["Comedy", "Romance"], requireAllGenres: true, yearFrom: 1990, limit: 12 },
  },
  {
    id: "romantic-drama",
    title: "Hjerte og smerte — romantisk drama",
    description: "Dype følelsesfilmer med konflikter, brudd eller tragisk kjærlighet.",
    source: "tmdb",
    tmdbQuery: { genres: ["Drama", "Romance"], requireAllGenres: true, limit: 12 },
  },
  {
    id: "love-triangle",
    title: "Kjærlighetstriangel",
    description: "Trekanthistorier hvor forhold og lojalitet utfordres.",
    source: "tmdb",
    tmdbQuery: { keywords: ["love triangle"], genres: ["Romance", "Drama"], limit: 12 },
  },
  {
    id: "slow-burn-romance",
    title: "Slow-burn-romantikk",
    description: "Filmer som bygger langsomt opp en intens følelsesmessig forbindelse.",
    source: "tmdb",
    tmdbQuery: { keywords: ["slow burn romance"], genres: ["Romance", "Drama"], limit: 12 },
  },
  {
    id: "romantic-comedies-classics",
    title: "Romantiske klassikere",
    description: "Tidløse rom-coms (før 1990).",
    source: "tmdb",
    tmdbQuery: { genres: ["Comedy", "Romance"], requireAllGenres: true, yearTo: 1989, limit: 12 },
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
    source: "tmdb",
    tmdbQuery: { keywords: ["courtroom", "trial", "legal drama"], genres: ["Drama", "Crime"], limit: 12 },
  },
  {
    id: "family-drama",
    title: "Familiens byrder",
    description: "Intime historier om familie, arv og forhold.",
    source: "tmdb",
    tmdbQuery: { genres: ["Drama"], keywords: ["family relationships", "family conflict", "dysfunctional family"], limit: 12 },
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
    source: "tmdb",
    tmdbQuery: { genres: ["War"], keywords: ["world war ii", "second world war"], limit: 12 },
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
    source: "tmdb",
    tmdbQuery: { genres: ["Documentary"], keywords: ["nature", "wildlife"], limit: 12 },
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
    source: "tmdb",
    tmdbQuery: { genres: ["Documentary"], keywords: ["politics", "society", "investigation"], limit: 12 },
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
    source: "tmdb",
    tmdbQuery: { keywords: ["whodunit", "murder mystery"], genres: ["Mystery", "Crime"], limit: 12 },
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
    source: "tmdb",
    tmdbQuery: { keywords: ["locked room", "single location mystery", "contained thriller"], genres: ["Mystery", "Thriller", "Drama"], limit: 12 },
  },
  {
    id: "gothic-mystery",
    title: "Gammel gotisk mystikk",
    description: "Gotisk stemning — slott, hemmeligheter og overtro.",
    source: "tmdb",
    tmdbQuery: { keywords: ["gothic", "haunted house", "mystery"], genres: ["Mystery", "Drama", "Horror"], limit: 12 },
  },
  {
    id: "high-fantasy",
    title: "Høyfantasy & episk magi",
    description: "Verdensbygging, magi og heltereiser.",
    source: "tmdb",
    tmdbQuery: { genres: ["Fantasy", "Adventure"], requireAllGenres: true, keywords: ["high fantasy", "epic fantasy"], limit: 12 },
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
    source: "tmdb",
    tmdbQuery: { keywords: ["dark fantasy"], genres: ["Fantasy", "Drama", "Horror"], limit: 12 },
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
    source: "tmdb",
    tmdbQuery: { genres: ["Fantasy", "Adventure"], requireAllGenres: true, yearFrom: 1970, limit: 12 },
  },
  {
    id: "coming-of-age-mystery",
    title: "Ungdom, oppvekst og mysterier",
    description: "Voksesmerter + et underliggende mysterium (unge protagonister og gåter).",
    source: "tmdb",
    tmdbQuery: { keywords: ["coming of age", "mystery"], genres: ["Drama", "Mystery"], limit: 12 },
  },
  {
    id: "romantic-thriller",
    title: "Kjærlighet i fare — romantic thriller",
    description: "Romantikk blandet med fare, bedrag eller konspirasjon.",
    source: "tmdb",
    tmdbQuery: { genres: ["Thriller", "Romance"], requireAllGenres: true, keywords: ["romantic thriller"], limit: 12 },
  },
  {
    id: "fantasy-folklore",
    title: "Folkeeventyr og magisk realisme",
    description: "Filmer som blandes mellom folklore, magisk realisme og symbolikk.",
    source: "tmdb",
    tmdbQuery: { keywords: ["folklore", "magical realism"], genres: ["Fantasy", "Drama"], limit: 12 },
  },

  // --- Nye regler ---
  {
    id: "musikaler",
    title: "Musikaler",
    description: "Store melodier, koreografi og historier hvor rollefigurene plutselig begynner å synge.",
    source: "tmdb",
    tmdbQuery: { genres: ["Music", "Drama", "Comedy"], keywords: ["musical", "song and dance"], limit: 12 },
  },
  {
    id: "mafiafilmer",
    title: "Mafiafilmer",
    description: "Familie, lojalitet, makt og organiserte forbrytelser med alvorlige personalproblemer.",
    source: "tmdb",
    tmdbQuery: { genres: ["Crime", "Drama"], keywords: ["mafia", "organized crime", "mob"], limit: 12 },
  },
  {
    id: "britiske-gangstere",
    title: "Britiske gangstere",
    description: "Skarpe dresser, tørr dialog og kriminelle miljøer på den andre siden av Atlanteren.",
    source: "tmdb",
    tmdbQuery: { genres: ["Crime", "Thriller"], keywords: ["british gangster", "london underworld"], query: "british crime", limit: 12 },
  },
  {
    id: "quotable-filmer",
    title: "Quotable filmer",
    description: "Filmer hvor halve opplevelsen er å sitere replikkene etterpå.",
    source: "tmdb",
    tmdbQuery: { keywords: ["cult film", "classic", "one liner"], genres: ["Comedy", "Crime", "Action"], limit: 12 },
  },
  {
    id: "undervurdert-bruce-willis",
    title: "Undervurdert Bruce Willis",
    description: "Mindre opplagte Willis-filmer hvor han spiller mer sårbart, lavmælt eller selvironisk enn i de største actionfilmene.",
    source: "tmdb",
    tmdbQuery: { person: "Bruce Willis", personRole: "actor", yearFrom: 1985, keywords: ["drama", "dark comedy", "neo-noir"], limit: 20 },
  },
  {
    id: "undervurdert-sylvester-stallone",
    title: "Undervurdert Sylvester Stallone",
    description: "Stallone utenfor Rocky og Rambo, i tidlige roller, mørkere thrillere og mer dramatiske karakterstudier.",
    source: "tmdb",
    tmdbQuery: { person: "Sylvester Stallone", personRole: "actor", yearFrom: 1970, keywords: ["crime", "thriller", "drama"], limit: 20 },
  },
  {
    id: "undervurdert-arnold-schwarzenegger",
    title: "Undervurdert Arnold Schwarzenegger",
    description: "Filmer som viser komisk timing, selvironi eller mer dramatisk spill enn den typiske actionhelten.",
    source: "tmdb",
    tmdbQuery: { person: "Arnold Schwarzenegger", personRole: "actor", keywords: ["comedy", "satire", "drama"], limit: 20 },
  },
  {
    id: "undervurdert-nicolas-cage",
    title: "Undervurdert Nicolas Cage",
    description: "Tidlige, mindre eller oversette filmer hvor Cage viser registeret bak den berømte intensiteten.",
    source: "tmdb",
    tmdbQuery: { person: "Nicolas Cage", personRole: "actor", yearTo: 2010, keywords: ["independent film", "drama", "comedy"], limit: 20 },
  },
  {
    id: "undervurdert-clint-eastwood",
    title: "Undervurdert Clint Eastwood",
    description: "Mindre omtalte filmer hvor Eastwood utfordrer western- og Dirty Harry-personaen sin.",
    source: "tmdb",
    tmdbQuery: { person: "Clint Eastwood", personRole: "actor", keywords: ["drama", "thriller", "character study"], limit: 20 },
  },
  {
    id: "undervurdert-kurt-russell",
    title: "Undervurdert Kurt Russell",
    description: "Roller utenfor de mest kjente Carpenter-filmene, med svart humor, drama og mørkere karakterarbeid.",
    source: "tmdb",
    tmdbQuery: { person: "Kurt Russell", personRole: "actor", keywords: ["dark comedy", "crime", "drama"], limit: 20 },
  },
  {
    id: "undervurdert-johnny-depp",
    title: "Undervurdert Johnny Depp",
    description: "Særpregede, lavmælte eller risikable roller som ofte havner i skyggen av hans største kommersielle filmer.",
    source: "tmdb",
    tmdbQuery: { person: "Johnny Depp", personRole: "actor", keywords: ["independent film", "drama", "biographical"], limit: 20 },
  },
  {
    id: "undervurdert-jack-nicholson",
    title: "Undervurdert Jack Nicholson",
    description: "Underkjente og mer tilbakeholdne Nicholson-prestasjoner utenfor de mest siterte klassikerne.",
    source: "tmdb",
    tmdbQuery: { person: "Jack Nicholson", personRole: "actor", keywords: ["drama", "romance", "character study"], limit: 20 },
  },
  {
    id: "parodi-spoof",
    title: "Parodi / spoof",
    description: "Filmer som gjør narr av etablerte sjangre, filmklisjeer og kjente titler gjennom overdrivelse, absurditet og tettpakket referansehumor.",
    source: "tmdb",
    tmdbQuery: { genres: ["Comedy"], keywords: ["spoof", "parody", "satire"], limit: 12 },
  },
  {
    id: "hoylydt-og-braakete",
    title: "Høylydt og bråkete",
    description: "Eksplosjoner, pang-pang og maksimal action.",
    source: "tmdb",
    tmdbQuery: {
      genres: ["Action", "Thriller"],
      keywords: ["explosion", "gunfight", "chaos"],
    },
  },
  {
    id: "basert-paa-videospill",
    title: "Basert på videospill",
    description: "Filmer inspirert av eller basert på videospill.",
    source: "tmdb",
    tmdbQuery: {
      keywords: ["video game", "based on video game"],
      genres: ["Action", "Adventure", "Science Fiction"],
    },
  },
  {
    id: "snikmordere-og-leiesoldater",
    title: "Snikmordere og leiesoldater",
    description: "Leiemordere, kontrakter og dødelige oppdrag i skyggene.",
    source: "tmdb",
    tmdbQuery: {
      keywords: ["assassin", "hitman", "mercenary"],
      genres: ["Action", "Thriller", "Crime"],
    },
  },
];
