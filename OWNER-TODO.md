# Verkefnalisti fyrir eiganda

Þessi skrá er ekki tengd af vefnum. Hún er fyrir yfirferð áður en síðan fer í loftið.

## Ekki búið til, því staðreyndir vantar

- Símanúmer fyrirtækisins. Án þess er enginn „Hringja“-hnappur.
- Opnunartími.
- Pósthólf `jarnverk@jarnverk.is` er fyrirhugað (Google Workspace) en er ekki virkt. Netfangið er ekki birt á síðunni.
- Móttaka tilboðsforms. `api/server.js` tekur við beiðni, sannreynir reiti og skrár, og sendir póst aðeins ef `SMTP_HOST` og `QUOTE_TO` eru sett. Án þeirra svarar þjónninn 503 og síðan sýnir villu, aldrei „Beiðnin er send“.
  - `QUOTE_TO` á að vera `jarnverk@jarnverk.is` þegar hólfið er virkt.
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `QUOTE_FROM`.
  - `QUOTE_ORIGIN` ef vefur og þjónn eru á sitt hvoru léninu, t.d. `https://jarnverk-preview.onrender.com,https://jarnverk.is`.
  - `TURNSTILE_SECRET` og `TURNSTILE_SITE_KEY` ef Cloudflare Turnstile á að bætast við hunangspottinn.
  - Keyrsla: `cd api && npm install && npm start`. Þjónninn hlustar á `0.0.0.0:$PORT`.
  - Prófa: `cd api && npm test`.
- Raunveruleg verkefni: heiti, ár, tegund, stutt lýsing, heimild til að nefna verkkaupa og staðsetningu, forsíðumynd og fleiri myndir. Setja í `js/projects.js` með `published: true`. Þá birtast listi, sía, myndir og `/verkefni/verk/?id=`. Engin drög eru í þeirri skrá.
- Ljósmyndir af vélunum sjálfum, og tegund eða gerð þar sem hún á við. Ekki útskýra fjarveru myndanna á síðunni.
- Starfsfólk: nöfn, starfsheiti, myndir og stutt kynning. Ekkert teymi er á síðunni.
- Saga, áherslur og öryggisferlar eða vottanir, ef þau eiga að birtast.
- Samfélagsmiðlar, ef þeir eru til.
- Heimild til að halda merkjum Veitna, HS Veitna, Bláa lónsins og Ístaks á síðunni.
- Orðmerki Bláa lónsins. Opinberi vefurinn lokaði á sækningu; texti er notaður þar til SVG eða PNG berst.
- Dæmi um verk á hverri þjónustusíðu, tæknilegar tölur (dýpt, þvermál, lengd) og svör við spurningum sem ekki eru þegar staðfestar.

## Þegar staðfest

- Kennitala 650914-0660, Ármúli 24, 108 Reykjavík, jarnverk.is.
- Þjónusta: lagnaþjónusta í jörðu, jarðvegsþjónusta, yfirborðsfrágangur, húsgrunnar, drenlagnir, mokstur fyrir palla, snjóþjónusta.
- Tækjalisti: vörubílar (fjöldi ekki tilgreindur, ekki skrifa það á síðuna), krókheysisbílar (fjöldi ekki tilgreindur), 4 hjólavélar, 1 beltavél 10 t, 2 beltavélar 5,7 t, 2 minigröfur, 2 vélhjólbörur, ásamt ýmsum öðrum búnaði.
- Viðskiptavinir: Veitur, HS Veitur, Bláa lónið, Ístak.
- Snjór á forsíðu frá 1. nóvember til 31. mars. Slökkt með hnappi eða `?snow=0`. Kveikt utan tímabils með `?snow=1`.

## Áður en vefurinn fer í loftið

- Taka af `noindex` og `Disallow` í `robots.txt`. Drög-borðinn á líka að hverfa þegar eigandi samþykkir útgáfu.
- Fara yfir texta með eiganda. Fyrirsögn forsíðu er lýsandi. „Við leggjum grunninn.“ stendur í fæti.
- Tengja formið við virkt pósthólf og prófa án þess að senda til viðskiptavinar.
- Ekki vísa á `CREDITS.md` á síðunni. Birta ekki lagerljósmyndir sem verk fyrirtækisins.
- Ákveða hvort `api/server.js` eigi að vera sérstök Render-þjónusta. Forskoðunin er kyrrstæð og nær ekki í `/api/tilbod` fyrr en þjónustan er tengd.
