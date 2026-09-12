# Package le logiciel pour une release GitHub. Deux artefacts :
# - AlbionLootLogger-vX.Y.Z.exe : executable standalone (pkg), aucune installation
#   requise, c'est celui-ci que les membres de la guilde telechargent.
# - albion-loot-logger-desktop-vX.Y.Z.zip : source + node_modules deja compile, pour
#   mon usage dev (npm start) uniquement.
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pkgJson = Get-Content (Join-Path $root "package.json") | ConvertFrom-Json
$version = $pkgJson.version

Push-Location $root
try {
    $distDir = Join-Path $root "dist"
    if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
    New-Item -ItemType Directory -Path $distDir | Out-Null

    $exePath = Join-Path $distDir "AlbionLootLogger-v$version.exe"
    Write-Output "Build de l'executable avec icone ($exePath)..."
    node scripts/build-exe.js $exePath
    if ($LASTEXITCODE -ne 0) { throw "build-exe.js a echoue" }

    $stagingDir = Join-Path $env:TEMP "albion-loot-logger-desktop-v$version"
    $zipPath = Join-Path $distDir "albion-loot-logger-desktop-v$version.zip"
    if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
    New-Item -ItemType Directory -Path $stagingDir | Out-Null

    $include = @("src", "node_modules", "package.json", "package-lock.json", "LICENSE", "NOTICE.md", "README.md", ".env.example")
    foreach ($item in $include) {
        $srcPath = Join-Path $root $item
        if (Test-Path $srcPath) {
            Copy-Item $srcPath -Destination (Join-Path $stagingDir $item) -Recurse -Force
        }
    }
    Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -Force
    Remove-Item $stagingDir -Recurse -Force

    Write-Output ""
    Write-Output "Artefacts crees dans $distDir (version $version) :"
    Write-Output "  - $exePath"
    Write-Output "  - $zipPath"
}
finally {
    Pop-Location
}
