// Corrèle les "New*Item" (un item apparaît quelque part, avec son type+quantité) et
// "InventoryPutItem" (cet ObjectId rejoint mon inventaire, sans dire lequel) — les deux
// events sont distincts depuis la mise à jour Albion de septembre 2026. Voir
// data-handler/event-data/ev-new-item.js et ev-inventory-put-item.js.
//
// Le cache n'a pas d'expiration basée sur le temps (seulement une borne mémoire) — un
// ObjectId enregistré il y a longtemps (ex: ta propre food, vue une fois en tout début de
// session) reste matchable indéfiniment. Ça produisait des faux positifs : équiper/
// déséquiper ou déposer un item dans un coffre redéclenche EvInventoryPutItem pour un
// ObjectId déjà connu, sans qu'aucun EvNewItem récent ne l'ait précédé — voir getFresh().
const MAX_ENTRIES = 2000 // borne mémoire — les plus vieilles entrées sont oubliées au-delà

class ItemEntitiesStorage {
    constructor() {
        this.entities = new Map() // objectId -> { itemNumId, quantity, registeredAt }
    }

    register(objectId, itemNumId, quantity) {
        if (objectId == null) return
        this.entities.set(objectId, { itemNumId, quantity, registeredAt: Date.now() })
        if (this.entities.size > MAX_ENTRIES) {
            const oldest = this.entities.keys().next().value
            this.entities.delete(oldest)
        }
    }

    // Ne renvoie l'entrée que si son EvNewItem date de moins de maxAgeMs — un vrai
    // ramassage a toujours un EvNewItem tout récent juste avant (l'item apparaît, puis tu
    // le prends quelques secondes après) ; équiper/déséquiper ou déposer dans un coffre
    // n'en ont aucun à proximité (l'ObjectId est déjà connu depuis longtemps).
    // Ne supprime pas l'entrée : un même ObjectId peut être référencé par plusieurs
    // InventoryPutItem si le stack est repris/déplacé plusieurs fois.
    getFresh(objectId, maxAgeMs) {
        const entity = this.entities.get(objectId)
        if (!entity) return null
        if (Date.now() - entity.registeredAt > maxAgeMs) return null
        return entity
    }
}

module.exports = new ItemEntitiesStorage()
