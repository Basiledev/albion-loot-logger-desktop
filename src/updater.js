const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn, execFileSync } = require('child_process')
const { version: currentVersion } = require('../package.json')

// Dépôt public sur lequel les releases sont publiées (tag "vX.Y.Z"). Deux types d'assets
// selon comment le logiciel tourne :
// - un .exe (build pkg) pour les utilisateurs finaux → voir scripts/package-release.ps1
// - un .zip (source + node_modules) pour mon usage dev via `npm start`
const REPO = 'Basiledev/albion-loot-logger-desktop'
const CHECK_TIMEOUT_MS = 8_000
const DOWNLOAD_TIMEOUT_MS = 60_000
const IS_PKG = typeof process.pkg !== 'undefined'

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

async function fetchLatestRelease() {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { 'User-Agent': 'albion-loot-logger-desktop', Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const release = await res.json()
    const latestVersion = (release.tag_name || '').replace(/^v/, '')
    if (!latestVersion || !isNewer(latestVersion, currentVersion)) return null
    return { release, latestVersion }
}

// Cas .exe (build pkg, usage normal) : remplacer un .exe en cours d'exécution est
// interdit par Windows tant que le process tourne. On télécharge le nouveau .exe sous un
// nom temporaire à côté de l'actuel, puis on détache un petit script PowerShell qui
// attend la fin du process courant (par PID) avant de faire le remplacement + relance.
// Le process courant, lui, se contente de rendre `{ updated: true }` pour que l'appelant
// s'arrête immédiatement (voir index.js) — c'est ce qui débloque le Move-Item.
async function updateExe(release, latestVersion) {
    const asset = (release.assets || []).find((a) => a.name.endsWith('.exe'))
    if (!asset) return { updated: false }

    console.info(`Mise a jour disponible : v${currentVersion} -> v${latestVersion}. Telechargement...`)

    const exePath = process.execPath
    const exeDir = path.dirname(exePath)
    const newExePath = path.join(exeDir, '.update-new.exe')
    await downloadFile(asset.browser_download_url, newExePath)

    // Le fichier reste souvent verrouille bien plus de quelques secondes apres la sortie
    // du process (Windows Defender scanne le .exe fraichement telecharge, non signe) —
    // fenetre de retry large (jusqu'a ~2 minutes) pour laisser passer ca sans echouer.
    // Unblock-File retire aussi le flag "provient d'internet" (evite l'avertissement
    // SmartScreen au lancement automatique).
    const helperPath = path.join(os.tmpdir(), `albion-loot-logger-update-${Date.now()}.ps1`)
    const helperScript = [
        `$targetPid = ${process.pid}`,
        `try { Wait-Process -Id $targetPid -Timeout 30 -ErrorAction SilentlyContinue } catch {}`,
        `try { Unblock-File -Path '${newExePath}' -ErrorAction SilentlyContinue } catch {}`,
        `for ($i = 0; $i -lt 80; $i++) {`,
        `    try {`,
        `        Move-Item -Force '${newExePath}' '${exePath}'`,
        `        try { Unblock-File -Path '${exePath}' -ErrorAction SilentlyContinue } catch {}`,
        `        Start-Process '${exePath}'`,
        `        break`,
        `    } catch {`,
        `        Start-Sleep -Milliseconds 1500`,
        `    }`,
        `}`,
        `Remove-Item -Force '${helperPath}' -ErrorAction SilentlyContinue`,
    ].join('\n')
    fs.writeFileSync(helperPath, helperScript)

    const child = spawn('powershell', [
        '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-File', helperPath,
    ], { detached: true, stdio: 'ignore', windowsHide: true })
    child.unref()

    console.info('Mise a jour en cours, redemarrage automatique...\n')
    return { updated: true }
}

// Cas dev (`npm start`, pas de .exe) : ancien flux — extrait le zip dans un dossier
// voisin (jamais par-dessus les fichiers en cours d'exécution) et relance node dessus.
async function updateZip(release, latestVersion) {
    const asset = (release.assets || []).find((a) => a.name.endsWith('.zip'))
    if (!asset) return { updated: false }

    console.info(`Mise a jour disponible : v${currentVersion} -> v${latestVersion}. Telechargement...`)

    const zipPath = path.join(os.tmpdir(), `albion-loot-logger-desktop-v${latestVersion}.zip`)
    await downloadFile(asset.browser_download_url, zipPath)

    const parentDir = path.resolve(__dirname, '..', '..')
    const newDir = path.join(parentDir, `albion-loot-logger-desktop-v${latestVersion}`)
    fs.rmSync(newDir, { recursive: true, force: true })
    fs.mkdirSync(newDir, { recursive: true })

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
}

// Vérifie s'il existe une version plus récente publiée sur GitHub Releases et, si oui,
// l'installe (voir updateExe/updateZip selon le mode d'exécution), puis rend
// `{ updated: true }` pour que l'appelant s'arrête. Best-effort : toute erreur (pas de
// réseau, GitHub down...) est avalée et on continue avec la version actuelle plutôt que
// de bloquer le lancement.
async function checkAndUpdate() {
    try {
        const found = await fetchLatestRelease()
        if (!found) return { updated: false }
        const { release, latestVersion } = found
        return IS_PKG ? await updateExe(release, latestVersion) : await updateZip(release, latestVersion)
    } catch (error) {
        console.error('Verification de mise a jour impossible (on continue avec la version actuelle) :', error.message)
        return { updated: false }
    }
}

module.exports = { checkAndUpdate, isNewer }
