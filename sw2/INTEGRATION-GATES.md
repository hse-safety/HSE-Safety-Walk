# Safety Walk 2.0 – integrationskontrol (ikke frigivet)

## Bekræftet i repository
- Staging-appfilen `app-v137.html` har nu en krypteringsport i SEND og bygger fortsat den oprindelige standalone-rapport.
- Krypteringsmodulerne og en særskilt rapportåbner ligger under `sw2/`.
- `sw2/config.mjs` peger stadig på Supabase TEST. Det er IKKE en produktionskonfiguration.
- `safety-login.html` og `index.html` fremstår tomme ved direkte læsning fra GitHub. Dermed kan appens reelle login/session-forwarding ikke udledes sikkert af de filer, og fælles login er IKKE verificeret.
- `app-v137.html` afregistrerer selv service workers ved load og rydder cache. En ny cacheversion i `sw.js` kan derfor ikke alene garantere automatisk opdatering.
- Den nuværende rapportåbners `iframe` bruger sandbox og skal gennemgås i rigtig browser: DOM, billeder, intern autosave, print og datalagring kan opføre sig anderledes end i original HTML.
- Tidligere funktionstest var med en separat lokal testpakke. GitHub-staging-versionen er **ikke** endnu funktionstestet som samlet app.

## Obligatorisk før integration / frigivelse
1. Undersøg hvor den installerede app faktisk henter login/session fra (produktionsprojekt `hvgljbyethfwxajnrvvi`). Kræv centralt profiles.active. Ingen separat iPhone-login.
2. Udskift TEST-konfiguration med produktion udelukkende under kontrolleret release og efter serverbeskyttelsen er installeret/testet. Ingen krypterings- eller Vault-nøgler i klientkode.
3. Test SEND fra installeret iPhone og dekrypter/gem igen via rapportåbner på HTTPS.
4. Kontrollér browseradfærd (især sandbox/print), online-spærring, cache og tilbageførsel.
5. Frigiv kun efter særskilt godkendelse. Bevar eksisterende Safety Walk 1.0, indhold, layout og forløb.

## Sikkerhed
En UI-spærring er aldrig kopibeskyttelse i sig selv. Rapportfilen skal være AES-GCM-krypteret, og serveren må kun frigive indholdsnøglen til godkendte aktive brugere. Allerede dekrypterede eller eksporterede PDF'er kan ikke tilbagekaldes. Offlinetilladelse er ikke implementeret.

## Kontrol 2026-10-09 – verificerede produktionsforhold
- GitHub `safety-login.html` er **0 byte** på udviklingsgrenen. Kan derfor ikke bruges til at lokalisere den aktive login/loader-kode. Det forbyder at antage, at `sw2Client` automatisk deler session med iPhone-login.
- Supabase **produktion** (kun læst, ikke ændret): Storage-bucket `safety-modules` indeholder `onsite-v1.0.html` og `kvi-premises-v1.0.html`.
- Den private inspektionsmoduls faktiske kildekode samt login-loader skal fremskaffes via en godkendt eksport eller konnektor med Storage-filadgang. Indtil da er `private-module-bridge.mjs` kun forberedende og må ikke installeres i produktionen.
- Supabase TEST og produktion har forskellige brugerkonti og sessioner. Testmiljøets API-nøgle og brugerprofil må ikke forveksles med produktionens eksisterende User Management.
- Vigtig frigivelseskontrol: En krypteret HTML-rapport skal åbnes af **alle aktive/godkendte brugere**, ikke kun den oprindelige inspektør; testen skal omfatte tilbagekaldelse af godkendelse.
