const ResponseData = require('./response-data')
const EventData = require('./event-data')
const Logger = require('../utils/logger')
const ParserError = require('./parser-error')
const Config = require('../config')
const Stats = require('../utils/stats')

Stats.start()

// Version allégée d'ao-loot-logger : on ne traite que les deux events dont /loottrack a
// besoin (loot ramassé + changement de zone). Tout le reste (equipement, stats, chat...)
// est ignoré — voir NOTICE.md pour le détail de ce qui a été retiré du fork original.
//
// DISCOVER=1 : affiche (une seule fois par code d'event rencontré, pour ne pas spammer)
// le code et les types de paramètres de chaque event — sert à retrouver le bon code
// EvOtherGrabbedLoot quand Albion change ses IDs d'event (patch de contenu). Log TOUT
// (pas seulement ce qui contient du texte, ni seulement les events non gérés) car le
// nouvel event de loot n'a peut-être plus aucun nom de joueur dedans.
//
// Le dédoublonnage "un seul affichage par code, à vie" cache un event si son code est
// déjà sorti plus tôt pour une tout autre raison (ex: quelqu'un d'autre a fait la même
// action avant toi) — appuyer sur Config.DISCOVER_WINDOW_KEY ouvre une fenêtre de
// quelques secondes où TOUT est réaffiché sans dédoublonnage, pour capturer précisément
// ce qui se passe pile au moment d'une action isolée (looter un seul item).
const seenDiscoveryIds = new Set()
let discoveryWindowUntil = 0

function openDiscoveryWindow() {
    if (process.env.DISCOVER !== '1') return
    discoveryWindowUntil = Date.now() + Config.DISCOVER_WINDOW_MS
    console.info(`[DISCOVER] Fenêtre ouverte pour ${Config.DISCOVER_WINDOW_MS / 1000}s — fais ton action maintenant.`)
}

function discover(source, eventId, parameters) {
    if (process.env.DISCOVER !== '1') return
    const windowActive = Date.now() < discoveryWindowUntil
    if (!windowActive && seenDiscoveryIds.has(`${source}:${eventId}`)) return
    seenDiscoveryIds.add(`${source}:${eventId}`)
    const shape = Object.fromEntries(Object.entries(parameters).map(([k, v]) => [k, typeof v === 'string' ? `"${v}"` : typeof v]))
    const time = new Date().toLocaleTimeString()
    console.info(`[DISCOVER ${time}]${windowActive ? ' [FENETRE]' : ''} ${source} id=${eventId} params=${JSON.stringify(shape)}`)
}

class DataHandler {
    static handleEventData(event) {
        try {
            const eventId = event?.parameters?.[252]

            // Sous Protocol 18, event.eventCode n'est plus fiablement 1 — on filtre plutôt
            // sur la présence du paramètre 252 (l'id d'event applicatif Albion lui-même).
            if (!event || !eventId) {
                return
            }

            Stats.counters.eventsDispatched++
            discover('event', eventId, event.parameters)

            switch (eventId) {
                case Config.events.EvOtherGrabbedLoot:
                    return EventData.EvOtherGrabbedLoot.handle(event)

                case Config.events.EvNewSimpleItem:
                case Config.events.EvNewEquipmentItem:
                case Config.events.EvNewFurnitureItem:
                case Config.events.EvNewSiegeBannerItem:
                case Config.events.EvNewKillTrophyItem:
                    return EventData.EvNewItem.handle(event)

                case Config.events.EvInventoryPutItem:
                    return EventData.EvInventoryPutItem.handle(event)

                default:
                    if (process.env.LOG_UNPROCESSED) Logger.silly('handleEventData', event.parameters)
            }
        } catch (error) {
            // ParserError = paquet reconnu mais dont la forme ne correspond pas à ce qu'on
            // attend (souvent un ID d'event réutilisé par autre chose côté jeu) — fréquent
            // et pas une vraie panne, donc seulement tracé dans debug-logs.txt.
            if (error instanceof ParserError) {
                Stats.counters.parserErrors++
                Logger.debug(error.message, event)
            } else {
                Logger.error(error, event)
            }
        }
    }

    static handleResponseData(event) {
        const eventId = event?.parameters?.[253]

        if (eventId) {
            Stats.counters.responsesDispatched++
            discover('response', eventId, event.parameters)
        }

        try {
            switch (eventId) {
                case Config.events.OpJoin:
                    return ResponseData.OpJoin.handle(event)

                default:
                    if (process.env.LOG_UNPROCESSED) Logger.silly('handleResponseData', event.parameters)
            }
        } catch (error) {
            if (error instanceof ParserError) {
                Stats.counters.parserErrors++
                Logger.debug(error.message, event)
            } else {
                Logger.error(error, event)
            }
        }
    }
}

module.exports = DataHandler
module.exports.openDiscoveryWindow = openDiscoveryWindow
