process.on('uncaughtException', (error) => {
    console.error(error)
})

process.on('unhandledRejection', (reason) => {
    console.error(reason)
})

const os = require('os')
const readline = require('readline')

const { version } = require('../package.json')
const Updater = require('./updater')
const ConsoleBuffer = require('./utils/console-buffer')

const CTRL_C = String.fromCharCode(3)

main()

async function main() {
    console.info(`Albion Loot Logger (guild) - v${version}\n`)

    // Priorité process abaissée : filet de sécurité pour qu'en cas de pic (gros burst de
    // loot), l'OS favorise toujours Albion plutôt que ce logiciel s'ils se disputent le CPU.
    try {
        os.setPriority(process.pid, os.constants.priority.PRIORITY_BELOW_NORMAL)
    } catch (error) {
        // Pas bloquant (ex: droits insuffisants sur certaines configs) — le logiciel
        // tourne simplement à priorité normale.
    }

    // Vérifié AVANT de charger le module de capture réseau (cap) : celui-ci verrouille
    // son .node natif une fois chargé, ce qui empêcherait un self-update propre.
    const { updated } = await Updater.checkAndUpdate()
    if (updated) {
        process.exit(0)
    }

    // Modules chargés seulement une fois sûr qu'on ne redémarre pas sur une version neuve.
    const { green, red, cyan, yellow } = require('./utils/colors')
    const AlbionNetwork = require('./network/albion-network')
    const DataHandler = require('./data-handler/data-handler')
    const Items = require('./items')
    const KeyboardInput = require('./keyboard-input')
    const Reporter = require('./reporter')
    const Config = require('./config')

    console.info(`Backend : ${Config.BACKEND_URL}\n`)

    await Items.init()

    const code = await askSessionCode()
    Reporter.pendingCode = code.toUpperCase()

    Reporter.onJoined = (result) => {
        if (result.ok) {
            console.info(`\n${green('OK - Connecte')} - activite : ${result.activityTitre ?? '?'}\n`)
        } else {
            console.error(`\n${red('ECHEC de connexion a la session')} : ${result.error}`)
            console.error(`Verifie le code et relance le logiciel.\n`)
        }
    }

    // Seuls ces deux events s'affichent en direct — tout le reste (paquets réseau, detail
    // interne) va dans debug-logs.txt (voir utils/logger.js) pour ne pas noyer l'utile.
    // Passe par ConsoleBuffer (écritures groupées) plutôt que console.info direct : même
    // affichage, une ligne par event, mais sans bloquer le thread JS event par event lors
    // d'un burst (ex: gros loot d'un coffre) — voir utils/console-buffer.js.
    Reporter.onEvent = (ev) => {
        if (ev.type === 'loot') {
            ConsoleBuffer.push(`  ${cyan('loot')}  ${ev.ingameName} x${ev.quantity} ${ev.itemType}${ev.lootedFrom ? ` (sur ${ev.lootedFrom})` : ''}`)
        } else if (ev.type === 'zone_change') {
            if (ev.isCity) {
                ConsoleBuffer.push(`  ${yellow('-> marque comme "en ville" (loot considere depose)')}`)
            } else {
                ConsoleBuffer.push(`  ${yellow('-> changement de map detecte')}`)
            }
        }
    }

    console.info(`En attente de detection du personnage (charge Albion si ce n'est pas deja fait)...\n`)

    AlbionNetwork.on('add-listener', (device) => {
        console.info(`Ecoute sur ${device.name}`)
    })

    AlbionNetwork.on('online', () => {
        console.info(`\n${green('ALBION DETECTE')}. Les events de loot devraient etre captures.\n`)
    })

    AlbionNetwork.on('offline', () => {
        console.info(`\n${red('ALBION NON DETECTE')}.\n\nSi Albion tourne, verifie que le logiciel est lance en Administrateur (necessaire pour la capture reseau).\n`)
    })

    AlbionNetwork.on('event-data', DataHandler.handleEventData)
    AlbionNetwork.on('response-data', DataHandler.handleResponseData)

    AlbionNetwork.init()

    KeyboardInput.on('key-pressed', (key) => {
        if (key === CTRL_C) return exit()

        if (key.toLowerCase() === Config.MARK_BANKED_KEY) {
            Reporter.markBankedNow()
        }

        if (key.toLowerCase() === Config.DISCOVER_WINDOW_KEY) {
            DataHandler.openDiscoveryWindow()
        }
    })

    KeyboardInput.init()

    const lines = [
        `Appuie sur "${Config.MARK_BANKED_KEY.toUpperCase()}" une fois ton loot depose en coffre (retour en ville) pour marquer le checkpoint.`,
    ]
    if (process.env.DISCOVER === '1') {
        lines.push(`Appuie sur "${Config.DISCOVER_WINDOW_KEY.toUpperCase()}" juste avant une action a identifier (ex: looter un item) pour tout voir sans filtre pendant ${Config.DISCOVER_WINDOW_MS / 1000}s.`)
    }
    lines.push('Ctrl+C pour quitter.')
    console.info(lines.join('\n'))
}

function askSessionCode() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise((resolve) => {
        rl.question('Code de session (donne par /loottrack start dans Discord) : ', (answer) => {
            rl.close()
            resolve(answer.trim())
        })
    })
}

function exit() {
    console.info('\nFermeture...')
    process.exit(0)
}
