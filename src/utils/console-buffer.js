// Regroupe les lignes de la console en écritures groupées plutôt qu'une par event.
//
// Sur Windows, écrire dans la console est une syscall synchrone — avec un burst de
// centaines d'events en quelques secondes (ex: un gros loot d'un coffre), des dizaines
// d'écritures synchrones à la suite bloquent le thread JS assez longtemps pour que l'OS
// doive partager le CPU avec le jeu, causant du lag en jeu. Le contenu affiché (une ligne
// par event, même texte qu'avant) ne change pas — seul le nombre d'appels stdout.write()
// baisse drastiquement (ex: 250 events -> ~15 écritures groupées au lieu de 250).
//
// Pattern : la première ligne poussée programme un flush dans FLUSH_INTERVAL_MS ; tant
// qu'un flush est déjà programmé, les lignes suivantes s'accumulent sans re-décaler le
// timer (sinon un flux continu d'events repousserait le flush indéfiniment).
const FLUSH_INTERVAL_MS = 200

class ConsoleBuffer {
    constructor() {
        this.lines = []
        this.timer = null
        process.on('exit', () => this.flush())
    }

    push(line) {
        this.lines.push(line)
        if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), FLUSH_INTERVAL_MS)
        }
    }

    flush() {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
        }
        if (this.lines.length === 0) return
        const out = this.lines.join('\n') + '\n'
        this.lines = []
        process.stdout.write(out)
    }
}

module.exports = new ConsoleBuffer()
