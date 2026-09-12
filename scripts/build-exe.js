// Build l'executable Windows avec l'icone de la guilde.
//
// pkg n'a pas d'option native pour definir l'icone d'un .exe : les outils habituels
// (rcedit, Resource Hacker...) RECONSTRUISENT le fichier PE et perdent au passage le
// payload que pkg ajoute a la fin du binaire (l'appli elle-meme) — l'exe resultant ne
// demarre plus ("Pkg: Error reading from file."). `pe-library`/`resedit` en revanche
// round-trippe le fichier octet pour octet (verifie manuellement), donc appliquer le
// remplacement d'icone sur le binaire de base AVANT que pkg n'y injecte son payload
// fonctionne. Seule contrainte : pkg-fetch verifie un hash SHA256 connu du binaire de
// base avant de l'utiliser — on doit donc aussi mettre a jour l'entree correspondante
// dans son fichier local `expected-shas.json` (jamais commite, jamais distribue —
// purement local a cette machine de build).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const PELibrary = require('pe-library');
const ResEdit = require('resedit');
const pkgFetch = require('@yao-pkg/pkg-fetch');

const ROOT = path.resolve(__dirname, '..');
const ICON_PNG = path.join(ROOT, 'build-assets', 'icon-source.png');
const ICON_ICO = path.join(ROOT, 'build-assets', 'icon.ico');

const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const [target] = pkgJson.pkg.targets; // ex: "node20-win-x64"
const [, nodeMajor, platform, arch] = target.match(/^(node\d+)-(\w+)-(\w+)$/);

async function ensureIco() {
    if (fs.existsSync(ICON_ICO)) return;
    if (!fs.existsSync(ICON_PNG)) {
        throw new Error(`Icone source manquante : ${ICON_PNG}`);
    }
    const pngToIco = require('png-to-ico').default;
    const buf = await pngToIco(ICON_PNG);
    fs.writeFileSync(ICON_ICO, buf);
    console.log('Icone .ico generee depuis', ICON_PNG);
}

function replaceIcon(buffer) {
    const exe = PELibrary.NtExecutable.from(buffer, { ignoreCert: true });
    const res = PELibrary.NtExecutableResource.from(exe);
    const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(ICON_ICO));
    const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
    if (!groups.length) throw new Error("Aucun groupe d'icone trouve dans le binaire de base");
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        groups[0].id,
        groups[0].lang,
        iconFile.icons.map((item) => item.data)
    );
    res.outputResource(exe);
    return Buffer.from(exe.generate());
}

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
    const outputArg = process.argv[2];
    if (!outputArg) throw new Error('Usage: node scripts/build-exe.js <output.exe>');

    await ensureIco();

    // 1. S'assure que le binaire de base est bien telecharge et verifie (hash officiel).
    const fetchedPath = await pkgFetch.need({ nodeRange: nodeMajor, platform, arch });
    console.log('Binaire de base pkg :', fetchedPath);

    // 2. Remplace l'icone dessus (avant l'injection du payload par pkg).
    const original = fs.readFileSync(fetchedPath);
    const patched = replaceIcon(original);
    fs.writeFileSync(fetchedPath, patched);

    // 3. pkg-fetch revalide ce fichier via un hash connu a chaque usage — on met a jour
    // l'entree locale pour qu'il accepte notre version avec l'icone.
    const expectedShasPath = require.resolve('@yao-pkg/pkg-fetch/lib-es5/expected-shas.json');
    const expectedShas = JSON.parse(fs.readFileSync(expectedShasPath, 'utf8'));
    const remote = require('@yao-pkg/pkg-fetch/lib-es5/places').remotePlace({
        arch, platform, nodeVersion: path.basename(fetchedPath).match(/-v[\d.]+-/)[0].slice(1, -1),
        version: require('@yao-pkg/pkg-fetch/package.json').version,
    });
    expectedShas[remote.name] = sha256(patched);
    fs.writeFileSync(expectedShasPath, JSON.stringify(expectedShas, null, 2));
    console.log('Icone appliquee sur le binaire de base, hash local mis a jour.');

    // 4. Build pkg normal — utilise desormais notre binaire de base avec l'icone.
    fs.mkdirSync(path.dirname(outputArg), { recursive: true });
    execFileSync('npx', ['pkg', '.', '-o', outputArg], { cwd: ROOT, stdio: 'inherit', shell: true });
    console.log('Build termine :', outputArg);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
