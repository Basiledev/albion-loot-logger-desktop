const ItemEntities = require('../../storage/item-entities-storage')
const Items = require('../../items')
const Reporter = require('../../reporter')
const ParserError = require('../parser-error')

const name = 'EvInventoryPutItem'

// EvInventoryPutItem est un event générique "cet item a été placé dans un slot
// d'inventaire" — il se déclenche pour un vrai ramassage de loot, mais AUSSI pour
// équiper/déséquiper une pièce ou déposer/retirer un item d'un coffre (l'outil de
// référence StatisticsAnalysisTool n'utilise d'ailleurs pas cet event pour cette raison).
// Le paramètre 2 (InteractGuid, cf. Network/Events/InventoryPutItemEvent.cs dans ce même
// outil) identifie l'interaction à l'origine du placement — non vide uniquement pour un
// vrai ramassage. HYPOTHÈSE non encore validée en jeu (voir discussion) : à confirmer/
// ajuster si des faux positifs (équipement, coffre) ou des faux négatifs (vrai loot
// ignoré) persistent.
function isEmptyGuid(value) {
    if (value == null) return true
    if (Array.isArray(value)) return value.length === 0 || value.every(b => b === 0)
    return false
}

// Toujours à propos du joueur LOCAL (c'est SON inventaire) — pas besoin de filtrer par
// nom comme pour EvOtherGrabbedLoot. L'ObjectId doit avoir été vu juste avant par un
// EvNewItem (voir ev-new-item.js) pour qu'on sache de quel item il s'agit ; sinon
// (ordre de paquets, item déjà connu d'avant le lancement du logiciel...) on ignore
// silencieusement plutôt que de rapporter un item inconnu.
function handle(event) {
    const { objectId, interactGuid } = parse(event)

    const entity = ItemEntities.get(objectId)
    if (!entity) return

    if (!Reporter.ingameName) return // pas encore identifié (voir Reporter.identifySelf)

    if (isEmptyGuid(interactGuid)) return // pas de ramassage réel (équipement/coffre) — voir commentaire ci-dessus

    const { itemId } = Items.get(entity.itemNumId) ?? { itemId: `UNKNOWN_${entity.itemNumId}` }

    Reporter.queueLoot({ ingameName: Reporter.ingameName, itemType: itemId, quantity: entity.quantity, lootedFrom: null })
}

function parse(event) {
    const objectId = event.parameters[0]

    if (typeof objectId !== 'number') {
        throw new ParserError('EvInventoryPutItem has invalid objectId parameter')
    }

    const inventorySlot = typeof event.parameters[1] === 'number' ? event.parameters[1] : null
    const interactGuid = event.parameters[2] ?? null

    return { objectId, inventorySlot, interactGuid }
}

module.exports = { name, handle, parse }
