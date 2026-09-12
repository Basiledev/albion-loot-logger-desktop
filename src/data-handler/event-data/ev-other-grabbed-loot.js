const Items = require('../../items')
const Reporter = require('../../reporter')
const ParserError = require('../parser-error')

const name = 'EvOtherGrabbedLoot'

// Ce packet donne le loot ramassé par N'IMPORTE QUEL joueur VISIBLE autour de soi (pas
// seulement soi-même — le nom "OtherGrabbedLoot" vient d'ao-loot-logger, dont c'était
// l'unique but). Une seule instance du logiciel peut donc rapporter le loot de tout le
// groupe visible ; le code de session est la seule barrière côté backend (voir
// events/route.ts) — pas besoin que chaque joueur observé ait fait son propre /join.
function handle(event) {
    const { isSilver, lootedFrom, lootedBy, itemNumId, quantity } = parse(event)

    if (isSilver) return

    // Le loot de soi-même est déjà capturé de façon fiable via EvInventoryPutItem — évite
    // un doublon si jamais ce packet-ci finit par aussi être émis pour soi.
    if (Reporter.ingameName && lootedBy.toLowerCase() === Reporter.ingameName.toLowerCase()) return

    const { itemId } = Items.get(itemNumId) ?? { itemId: `UNKNOWN_${itemNumId}` }

    Reporter.queueLoot({ ingameName: lootedBy, itemType: itemId, quantity, lootedFrom })
}

function parse(event) {
    const isSilver = event.parameters[3]

    const lootedFrom = event.parameters[1]

    // if the event is silver, it has no parameter 1.
    if (!isSilver && typeof lootedFrom !== 'string') {
        throw new ParserError('EvOtherGrabbedLoot has invalid lootedFrom parameter')
    }

    const lootedBy = event.parameters[2]

    if (typeof lootedBy !== 'string') {
        throw new ParserError('EvOtherGrabbedLoot has invalid lootedBy parameter')
    }

    const itemNumId = event.parameters[4]

    if (!isSilver && typeof itemNumId !== 'number') {
        throw new ParserError('EvOtherGrabbedLoot has invalid itemNumId parameter')
    }

    const quantity = event.parameters[5]

    if (typeof quantity !== 'number') {
        throw new ParserError('EvOtherGrabbedLoot has invalid quantity parameter')
    }

    return { isSilver, lootedFrom, lootedBy, itemNumId, quantity }
}

module.exports = { name, handle, parse }
