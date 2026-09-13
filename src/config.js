const { version } = require('../package.json')

// Codes d'event/opération Photon pour Albion Online sur Protocol 18 (depuis la mise à
// jour "Dragonfire", début septembre 2026). Valeurs croisées avec deux sources
// indépendantes : le fork protocol18 d'ao-loot-logger (PR #89) pour le décodage bas
// niveau, et l'énumération à jour de Triky313/AlbionOnline-StatisticsAnalysis (poussée le
// 2026-09-09, donc post-patch) pour les codes d'event eux-mêmes — OpJoin=2 est d'ailleurs
// déjà confirmé en direct (détection du perso qui fonctionne).
const EVENTS = {
    // Pickup d'un joueur VISIBLE (pas soi) — non exploité pour l'instant (voir NOTICE.md :
    // le backend refuse qu'un logiciel déclare des actions au nom d'un perso qui n'a pas
    // fait son propre /join). Gardé pour référence/debug console uniquement.
    EvOtherGrabbedLoot: 279,
    // Un item apparaît quelque part (butin d'un coffre/cadavre ouvert) — donne le type et
    // la quantité, mais pas encore "pris". Plusieurs variantes selon la catégorie d'item ;
    // seules celles utiles au loot de terrain sont gérées ici.
    EvNewEquipmentItem: 30,
    EvNewSiegeBannerItem: 31,
    EvNewSimpleItem: 32,
    EvNewFurnitureItem: 33,
    EvNewKillTrophyItem: 34,
    // L'item référencé par ObjectId rejoint l'inventaire du joueur LOCAL — c'est le vrai
    // signal "j'ai ramassé quelque chose", mais sans dire quoi (juste l'ObjectId) : il faut
    // le corréler avec l'event "New*Item" ci-dessus qui a créé cet ObjectId.
    EvInventoryPutItem: 26,
    OpJoin: 2, // arrivée dans une nouvelle zone/room Photon = changement de map
}

class Config {
    constructor() {
        this.events = EVENTS

        this.TITLE = `Albion Loot Logger (guild) - v${version}`
        this.MARK_BANKED_KEY = 'b'
        this.DISCOVER_WINDOW_KEY = 'm' // DISCOVER=1 uniquement : réaffiche tout sans dédoublonnage pendant DISCOVER_WINDOW_MS
        this.DISCOVER_WINDOW_MS = 8000

        // URL du backend web (route /api/loot/session/[code]/...) — surchageable via
        // BACKEND_URL dans .env, ex: http://localhost:3000 pour tester contre `npm run dev`.
        this.BACKEND_URL = process.env.BACKEND_URL || 'https://pfmanager.vercel.app'
        this.REPORT_INTERVAL_MS = 4000
        this.MAX_QUEUE_SIZE = 500 // au-delà, on jette les events les plus vieux (backend injoignable trop longtemps)

        // Un vrai ramassage a toujours un EvNewItem (l'item apparaît) tout récent avant
        // l'EvInventoryPutItem (tu le prends) — équiper/déséquiper ou déposer dans un coffre
        // n'en ont aucun à proximité (voir storage/item-entities-storage.js). Fenêtre
        // COURTE exprès (une première tentative à 20s laissait encore passer des
        // ré-équipements faits peu après le vrai ramassage — cas observé en conditions
        // réelles, 2026-09) : un vrai ramassage arrive quasi instantanément après l'item qui
        // apparaît (même clic), inutile de couvrir un délai de plusieurs secondes.
        this.LOOT_FRESHNESS_WINDOW_MS = 3_000
    }
}

module.exports = new Config()
