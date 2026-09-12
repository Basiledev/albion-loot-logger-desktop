// Corrèle les "New*Item" (un item apparaît quelque part, avec son type+quantité) et
// "InventoryPutItem" (cet ObjectId rejoint mon inventaire, sans dire lequel) — les deux
// events sont distincts depuis la mise à jour Albion de septembre 2026. Voir
// data-handler/event-data/ev-new-item.js et ev-inventory-put-item.js.
const MAX_ENTRIES = 2000 // borne mémoire — les plus vieilles entrées sont oubliées au-delà

class ItemEntitiesStorage {
    constructor() {
        this.entities = new Map() // objectId -> { itemNumId, quantity }
    }

    register(objectId, itemNumId, quantity) {
        if (objectId == null) return
        this.entities.set(objectId, { itemNumId, quantity })
        if (this.entities.size > MAX_ENTRIES) {
            const oldest = this.entities.keys().next().value
            this.entities.delete(oldest)
        }
    }

    // Ne supprime pas l'entrée : un même ObjectId peut être référencé par plusieurs
    // InventoryPutItem si le stack est repris/déplacé plusieurs fois.
    get(objectId) {
        return this.entities.get(objectId) ?? null
    }
}

module.exports = new ItemEntitiesStorage()
