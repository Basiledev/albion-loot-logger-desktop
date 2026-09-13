// Corrèle les "New*Item" (un item apparaît quelque part, avec son type+quantité) et
// "InventoryPutItem" (cet ObjectId rejoint mon inventaire, sans dire lequel) — les deux
// events sont distincts depuis la mise à jour Albion de septembre 2026. Voir
// data-handler/event-data/ev-new-item.js et ev-inventory-put-item.js.
//
// Le cache n'a pas d'expiration basée sur le temps (seulement une borne mémoire) — un
// ObjectId enregistré il y a longtemps (ex: ta propre food, déjà looté puis
// équipée/déséquipée ensuite) reste matchable indéfiniment. Ça produisait des faux
// positifs : équiper/déséquiper ou déposer un item dans un coffre redéclenche
// EvInventoryPutItem pour un ObjectId déjà connu — voir getFresh(). Deux garde-fous :
// - fenêtre de fraîcheur COURTE (l'EvNewItem doit dater de quelques secondes, pas 20s —
//   une première tentative à 20s laissait encore passer des ré-équipements faits peu après
//   le vrai ramassage, cas observé en conditions réelles) ;
// - "consommé une seule fois" : une fois un ObjectId compté comme loot, il ne peut plus
//   re-déclencher un rapport, même une autre fois dans la fenêtre de fraîcheur (bloque le
//   cas déséquiper PUIS rééquiper juste après, qui redéclenchait deux fois de suite).
const MAX_ENTRIES = 2000 // borne mémoire — les plus vieilles entrées sont oubliées au-delà

class ItemEntitiesStorage {
    constructor() {
        this.entities = new Map() // objectId -> { itemNumId, quantity, registeredAt, consumed }
    }

    register(objectId, itemNumId, quantity) {
        if (objectId == null) return
        this.entities.set(objectId, { itemNumId, quantity, registeredAt: Date.now(), consumed: false })
        if (this.entities.size > MAX_ENTRIES) {
            const oldest = this.entities.keys().next().value
            this.entities.delete(oldest)
        }
    }

    // Ne renvoie l'entrée (et la marque consommée) que si son EvNewItem date de moins de
    // maxAgeMs ET qu'elle n'a pas déjà été comptée — sinon renvoie null sans rien modifier.
    getFresh(objectId, maxAgeMs) {
        const entity = this.entities.get(objectId)
        if (!entity || entity.consumed) return null
        if (Date.now() - entity.registeredAt > maxAgeMs) return null
        entity.consumed = true
        return entity
    }
}

module.exports = new ItemEntitiesStorage()
