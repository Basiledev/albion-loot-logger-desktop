const Config = require('./config')
const Logger = require('./utils/logger')

// Remplace loot-logger.js (fichier local) d'ao-loot-logger : les events sont mis en
// file puis envoyés par lot vers /api/loot/session/[code]/events toutes les
// Config.REPORT_INTERVAL_MS, au lieu d'être écrits sur disque.
class Reporter {
    constructor() {
        this.code = null
        this.pendingCode = null // code entré par l'utilisateur, en attente de détection du perso
        this.ingameName = null
        this.activityTitre = null
        this.queue = []
        this.timer = null
        this.onEvent = null // callback UI (index.js) pour afficher les events localement
        this.onJoined = null // callback UI, appelé une fois le /join confirmé
    }

    // Appelé dès qu'un OpJoin détecte le perso actif (op-join.js) — termine
    // automatiquement le /join si un code a déjà été saisi par l'utilisateur, sans lui
    // demander de retaper son propre pseudo (source d'erreurs de frappe).
    async identifySelf(playerName) {
        if (this.code || !this.pendingCode || this.ingameName === playerName) return

        this.ingameName = playerName
        const result = await this.join(this.pendingCode, playerName)
        if (!result.ok) this.ingameName = null // permet de retenter au prochain OpJoin
        this.onJoined?.(result)
    }

    // Retourne { ok: true, activityTitre } ou { ok: false, error }
    async join(code, ingameName) {
        try {
            const res = await fetch(`${Config.BACKEND_URL}/api/loot/session/${code}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingameName, clientVersion: require('../package.json').version }),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok) {
                return { ok: false, error: data.error || `HTTP ${res.status}` }
            }

            this.code = code
            this.ingameName = ingameName
            this.activityTitre = data.activityTitre
            this.startFlushLoop()

            return { ok: true, activityTitre: data.activityTitre }
        } catch (error) {
            return { ok: false, error: error.message }
        }
    }

    // ingameName = qui a ramassé l'item (soi via EvInventoryPutItem, ou n'importe quel
    // joueur visible via EvOtherGrabbedLoot) — une seule instance peut donc rapporter le
    // loot de plusieurs personnages, le code de session étant la seule barrière côté backend.
    queueLoot({ ingameName, itemType, quality, quantity, lootedFrom }) {
        if (!this.code || !ingameName) return
        this.push({
            ingameName,
            type: 'loot',
            timestamp: new Date().toISOString(),
            item: { itemType, quality: quality ?? 1, quantity: quantity ?? 1, lootedFrom: lootedFrom ?? null },
        })
        this.onEvent?.({ ingameName, type: 'loot', itemType, quantity, lootedFrom })
    }

    // Les changements de zone ne concernent que soi (on ne peut pas savoir quand un autre
    // joueur observé dépose son loot en banque).
    queueZoneChange({ isCity, zoneName = null }) {
        if (!this.code || !this.ingameName) return
        this.push({
            ingameName: this.ingameName,
            type: 'zone_change',
            timestamp: new Date().toISOString(),
            zone: { isCity, zoneName },
        })
        this.onEvent?.({ type: 'zone_change', isCity, zoneName })
    }

    // Affichage local uniquement (terminal), sans envoi au backend — utilisé pour les
    // changements de zone détectés automatiquement (OpJoin), qui n'ont pas de nom de zone
    // ni de statut ville/pas-ville fiable et ne serviraient qu'à polluer le récap du site.
    // Le vrai checkpoint "loot déposé" reste markBankedNow(), déclenché manuellement.
    noteZoneChange() {
        this.onEvent?.({ type: 'zone_change', isCity: null })
    }

    markBankedNow() {
        this.queueZoneChange({ isCity: true })
    }

    push(event) {
        this.queue.push(event)
        if (this.queue.length > Config.MAX_QUEUE_SIZE) {
            this.queue.splice(0, this.queue.length - Config.MAX_QUEUE_SIZE)
        }
    }

    startFlushLoop() {
        if (this.timer) return
        this.timer = setInterval(() => this.flush(), Config.REPORT_INTERVAL_MS)
        process.on('exit', () => this.flush())
    }

    async flush() {
        if (!this.code || this.queue.length === 0) return

        const batch = this.queue.splice(0, 200)

        try {
            const res = await fetch(`${Config.BACKEND_URL}/api/loot/session/${this.code}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events: batch }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
        } catch (error) {
            // Échec réseau ponctuel : on remet le lot en tête de file pour retenter au
            // prochain tick, sans dépasser MAX_QUEUE_SIZE (voir push()).
            this.queue.unshift(...batch)
            Logger.warn('reporter flush failed', error.message)
        }
    }
}

module.exports = new Reporter()
