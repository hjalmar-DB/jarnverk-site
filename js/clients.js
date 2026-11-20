/* Viðskiptavinir sem birtast í röðinni „Við höfum unnið fyrir“.
   name: nafn. Notað sem orðmerki þegar logo vantar, og sem alt-texti þegar logo er til.
   logo: valkvæmt. Slóð á mynd, t.d. "/img/clients/veitur.svg".
         Þegar logo er útfyllt birtist myndin í stað textans.
         CSS gerir myndirnar ljósgráar og gular við hover.

   Heimildir (aðeins opinberar síður):
   Veitur — SVG í haus https://www.veitur.is/
   HS Veitur — SVG í haus https://www.hsveitur.is/
   Ístak — https://irp.cdn-website.com/24b0782e/dms3rep/multi/logo_hvitt.png
            (logo_hvitt.png á https://www.istak.is/)
   Bláa lónið — orðmerki. bluelagoon.com lokar á sækingu (Cloudflare)
                 og eina opinbera skráin sem náðist var 180px BL-tákn, ekki orðmerkið. */
var JARN_CLIENTS = [
  { name: "Veitur", logo: "/img/clients/veitur.svg" },
  { name: "HS Veitur", logo: "/img/clients/hs-veitur.svg" },
  { name: "Bláa lónið", logo: "" },
  { name: "Ístak", logo: "/img/clients/istak.png" }
];
