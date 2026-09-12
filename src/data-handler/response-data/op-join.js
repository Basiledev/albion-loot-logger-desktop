const MemoryStorage = require('../../storage/memory-storage')
const Reporter = require('../../reporter')
const Logger = require('../../utils/logger')
const ParserError = require('../parser-error')

const name = 'OpJoin'

// Adapté d'ao-loot-logger (GPL-3.0). OpJoin est envoyé par le client à chaque connexion
// à une nouvelle room Photon — en Albion, une room = une zone/cluster, donc CET EVENT
// EST le signal "changement de map" (portail/chargement). On ne connaît pas ici le nom
// de la destination ni si c'est une ville (voir Config.MARK_BANKED_KEY pour le
// checkpoint manuel côté utilisateur), seulement qu'un changement a eu lieu.
function handle(event) {
    const { allianceName, guildName, playerName } = parse(event)

    let player = MemoryStorage.players.getByName(playerName)

    if (player == null) {
        player = MemoryStorage.players.add({ playerName, guildName, allianceName })
    }

    MemoryStorage.players.self = player

    Logger.debug('OpJoin', player, event.parameters)

    Reporter.identifySelf(playerName)
    Reporter.noteZoneChange()
}

function parse(event) {
    const playerName = event.parameters[2]

    if (typeof playerName !== 'string') {
        throw new ParserError('OpJoin has invalid playerName parameter')
    }

    const guildName = event.parameters[58]
    const allianceName = event.parameters[79]

    return { allianceName, guildName, playerName }
}

module.exports = { name, handle, parse }
