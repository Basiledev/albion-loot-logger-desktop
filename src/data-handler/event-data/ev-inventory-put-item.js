const ItemEntities = require('../../storage/item-entities-storage')
const Items = require('../../items')
const Reporter = require('../../reporter')
const Config = require('../../config')
const ParserError = require('../parser-error')

const name = 'EvInventoryPutItem'

// Toujours à propos du joueur LOCAL (c'est SON inventaire) — pas besoin de filtrer par
// nom comme pour EvOtherGrabbedLoot. L'ObjectId doit avoir été vu par un EvNewItem RÉCENT
// (voir Config.LOOT_FRESHNESS_WINDOW_MS et storage/item-entities-storage.js#getFresh) pour
// être compté comme loot — sinon (équipement/déséquipement, dépôt dans un coffre, item
// déjà connu d'avant le lancement du logiciel...) on ignore silencieusement.
//
// Historique : un premier filtre basé sur le paramètre "InteractGuid" du paquet
// (parameters[2]) s'est avéré ne rien filtrer du tout — ce paramètre est rempli aussi bien
// pour un vrai ramassage que pour équiper/déséquiper (vérifié par capture DISCOVER réelle,
// 2026-09). Le vrai signal fiable est la fraîcheur de l'EvNewItem correspondant.
function handle(event) {
    const { objectId } = parse(event)

    const entity = ItemEntities.getFresh(objectId, Config.LOOT_FRESHNESS_WINDOW_MS)
    if (!entity) return

    if (!Reporter.ingameName) return // pas encore identifié (voir Reporter.identifySelf)

    const { itemId } = Items.get(entity.itemNumId) ?? { itemId: `UNKNOWN_${entity.itemNumId}` }

    Reporter.queueLoot({ ingameName: Reporter.ingameName, itemType: itemId, quantity: entity.quantity, lootedFrom: null })
}

function parse(event) {
    const objectId = event.parameters[0]

    if (typeof objectId !== 'number') {
        throw new ParserError('EvInventoryPutItem has invalid objectId parameter')
    }

    return { objectId }
}

module.exports = { name, handle, parse }
