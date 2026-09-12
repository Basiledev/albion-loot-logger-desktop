// Compteurs de diagnostic, actifs uniquement quand DISCOVER=1 (voir data-handler.js) —
// permet de voir si le souci est "rien n'arrive au décodeur" vs "le décodeur bas niveau
// tourne mais l'event de loot précis a le mauvais code", sans spammer la console en usage
// normal.
const counters = {
    packetsOk: 0,
    packetsFailed: 0,
    eventsDispatched: 0,
    responsesDispatched: 0,
    parserErrors: 0,
}

let started = false

function start() {
    if (started || process.env.DISCOVER !== '1') return
    started = true
    setInterval(() => {
        console.info(`[DISCOVER][stats] paquets OK=${counters.packetsOk} echecs=${counters.packetsFailed} | events avec id=${counters.eventsDispatched} responses avec id=${counters.responsesDispatched} | erreurs de parsing internes=${counters.parserErrors}`)
    }, 10_000)
}

module.exports = { counters, start }
