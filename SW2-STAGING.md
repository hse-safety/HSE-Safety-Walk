# Safety Walk 2.0 — udviklingsgren
Denne gren er KUN udvikling. GitHub Pages og den installerede Safety Walk 1.0 kører fortsat fra main.

## Verificeret i tidligere test
- Krypteret rigtig HTML-rapport kunne åbnes efter godkendelse i Supabase TEST.
- Brugeren bekræftede, at redigering, billeder, observationer, Best Practice og PDF fungerede.
- Fratagelse og genetablering af godkendelse blev testet i TEST.

## Stadig nødvendigt inden frigivelse
- Integrér den komplette krypterede HTML-eksport i den rigtige iPhone-app. Bevar alle 1.0-funktioner og layout.
- Portér og gennemgå rapportkryptering samt rapportåbner fra tidligere testpakke.
- Brug en sikker produktions-Edge Function med serverkontrol af profiles.active og en separat produktionsnøgle.
- Udgiv HTTPS-rapportåbner og test login/session mod eksisterende User Management.
- Verificér på iPhone, at service worker/cache faktisk opdaterer ved genstart; offline-licens er endnu ikke implementeret.
- Gennemfør ny eksport direkte fra iPhone, redigering, PDF og rollbacktest.
- Ingen ændringer på main før særskilt godkendelse.

Filen sw2/approval-controller.mjs er kun et generelt, fail-closed godkendelsesmodul. Den er ikke alene en komplet adgangsbeskyttelse; serverbaseret kontrol og kryptering er obligatorisk.
