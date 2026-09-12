# Package le logiciel en zip distribuable pour une release GitHub — inclut node_modules
# deja compile (les membres de la guilde n'ont pas a installer les Build Tools /
# Visual Studio) et exclut tout ce qui n'est pas necessaire (.git, .env, logs de debug).
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pkg = Get-Content (Join-Path $root "package.json") | ConvertFrom-Json
$version = $pkg.version

$stagingDir = Join-Path $env:TEMP "albion-loot-logger-desktop-v$version"
$zipPath = Join-Path $root "albion-loot-logger-desktop-v$version.zip"

if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
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

Write-Output "Package cree : $zipPath (version $version)"
