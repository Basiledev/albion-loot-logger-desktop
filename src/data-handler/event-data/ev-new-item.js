const ItemEntities = require('../../storage/item-entities-storage')
const ParserError = require('../parser-error')

const name = 'EvNewItem'

// Couvre EvNewSimpleItem/EvNewEquipmentItem/EvNewFurnitureItem/EvNewSiegeBannerItem/
// EvNewKillTrophyItem — même triplet utile (ObjectId, ItemId, Quantity) pour toutes ces
// variantes (voir Network/Events/New*ItemEvent.cs dans StatisticsAnalysisTool, cité dans
// NOTICE.md). On enregistre juste la correspondance ObjectId -> item pour que
// ev-inventory-put-item.js puisse la retrouver au moment du ramassage réel.
function handle(event) {
    const { objectId, itemNumId, quantity } = parse(event)
    ItemEntities.register(objectId, itemNumId, quantity)
}

function parse(event) {
    const objectId = event.parameters[0]

    if (typeof objectId !== 'number') {
        throw new ParserError('EvNewItem has invalid objectId parameter')
    }

    const itemNumId = event.parameters[1]

    if (typeof itemNumId !== 'number') {
        throw new ParserError('EvNewItem has invalid itemId parameter')
    }

    const quantity = typeof event.parameters[2] === 'number' ? event.parameters[2] : 1

    return { objectId, itemNumId, quantity }
}

module.exports = { name, handle, parse }
