$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$portableNodeDirs = Get-ChildItem -Path $scriptDir\node-portable -Directory -ErrorAction SilentlyContinue

if ($portableNodeDirs) {
    $nodeDir = $portableNodeDirs[0].FullName
    $nodePath = Join-Path $nodeDir 'node.exe'
    if (-not (Test-Path $nodePath)) {
        throw "Portable node.exe was not found in $nodeDir"
    }
    $env:Path = "$nodeDir;$env:Path"
    Write-Host "Using portable Node.js from $nodeDir"
} else {
    $nodePath = Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue
    if (-not $nodePath) {
        throw 'Node.js executable not found. Run .\install-node.ps1 first or install Node.js globally.'
    }
    Write-Host "Using global Node.js from $nodePath"
}

Set-Location $scriptDir
Write-Host 'Installing npm dependencies...'
if ((-not (Test-Path "$scriptDir\node_modules")) -or (-not (Test-Path "$scriptDir\node_modules\mysql2"))) {
    & npm install
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
Write-Host 'Starting backend server...'
& npm start
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
