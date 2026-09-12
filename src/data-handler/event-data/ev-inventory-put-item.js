const ItemEntities = require('../../storage/item-entities-storage')
const Items = require('../../items')
const Reporter = require('../../reporter')
const ParserError = require('../parser-error')

const name = 'EvInventoryPutItem'

// Toujours à propos du joueur LOCAL (c'est SON inventaire) — pas besoin de filtrer par
// nom comme pour EvOtherGrabbedLoot. L'ObjectId doit avoir été vu juste avant par un
// EvNewItem (voir ev-new-item.js) pour qu'on sache de quel item il s'agit ; sinon
// (ordre de paquets, item déjà connu d'avant le lancement du logiciel...) on ignore
// silencieusement plutôt que de rapporter un item inconnu.
function handle(event) {
    const { objectId } = parse(event)

    const entity = ItemEntities.get(objectId)
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
