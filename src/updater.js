const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn, execFileSync } = require('child_process')
const { version: currentVersion } = require('../package.json')

// Dépôt public sur lequel les releases (zip + numéro de version en tag "vX.Y.Z") sont
// publiées. Le zip doit contenir tout le nécessaire pour tourner directement (src/,
// node_modules/ déjà compilé, package.json...) — voir scripts/package-release.ps1.
const REPO = 'Basiledev/albion-loot-logger-desktop'
const CHECK_TIMEOUT_MS = 8_000
const DOWNLOAD_TIMEOUT_MS = 60_000

function parseVersion(v) {
    return (v || '').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
}

function isNewer(a, b) {
    const pa = parseVersion(a)
    const pb = parseVersion(b)
    for (let i = 0; i < 3; i++) {
        if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true
        if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false
    }
    return false
}

async function downloadFile(url, dest) {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
    if (!res.ok) throw new Error(`téléchargement échoué : HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(dest, buf)
}

// Vérifie s'il existe une version plus récente publiée sur GitHub Releases ; si oui, la
// télécharge, l'extrait dans un dossier voisin (jamais par-dessus les fichiers en cours
// d'exécution — évite tout souci de verrou Windows), puis relance le logiciel depuis ce
// nouveau dossier et rend `{ updated: true }` pour que l'appelant s'arrête.
// Best-effort : toute erreur (pas de réseau, GitHub down...) est avalée et on continue
// avec la version actuelle plutôt que de bloquer le lancement.
async function checkAndUpdate() {
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
            headers: { 'User-Agent': 'albion-loot-logger-desktop', Accept: 'application/vnd.github+json' },
            signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
        })
        if (!res.ok) return { updated: false }

        const release = await res.json()
        const latestVersion = (release.tag_name || '').replace(/^v/, '')
        if (!latestVersion || !isNewer(latestVersion, currentVersion)) return { updated: false }

        const asset = (release.assets || []).find((a) => a.name.endsWith('.zip'))
        if (!asset) return { updated: false }

        console.info(`Mise a jour disponible : v${currentVersion} -> v${latestVersion}. Telechargement...`)

        const zipPath = path.join(os.tmpdir(), `albion-loot-logger-desktop-v${latestVersion}.zip`)
        await downloadFile(asset.browser_download_url, zipPath)

        const parentDir = path.resolve(__dirname, '..', '..')
        const newDir = path.join(parentDir, `albion-loot-logger-desktop-v${latestVersion}`)
        fs.rmSync(newDir, { recursive: true, force: true })
        fs.mkdirSync(newDir, { recursive: true })

        // Expand-Archive est natif Windows 10+ — pas besoin d'ajouter une dépendance de
        // décompression juste pour l'auto-update.
        execFileSync('powershell', [
            '-NoProfile', '-NonInteractive', '-Command',
            `Expand-Archive -Path "${zipPath}" -DestinationPath "${newDir}" -Force`,
        ])
        fs.rmSync(zipPath, { force: true })

        console.info(`Mise a jour installee dans ${newDir}`)
        console.info('Relance avec la nouvelle version...\n')

        const child = spawn(process.execPath, [path.join(newDir, 'src', 'index.js')], {
            cwd: newDir,
            stdio: 'inherit',
            windowsHide: false,
        })
        child.unref()

        return { updated: true }
    } catch (error) {
        console.error('Verification de mise a jour impossible (on continue avec la version actuelle) :', error.message)
        return { updated: false }
    }
}

module.exports = { checkAndUpdate, isNewer }
