$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$zipPath = Join-Path $scriptDir 'node.zip'
$extractDir = Join-Path $scriptDir 'node-portable'

Write-Host 'Downloading latest Node.js LTS release information...'
$indexUrl = 'https://nodejs.org/dist/index.json'
$indexJson = Invoke-WebRequest -Uri $indexUrl -UseBasicParsing -ErrorAction Stop | Select-Object -ExpandProperty Content
$releases = $indexJson | ConvertFrom-Json
$release = $releases | Where-Object { $_.lts -ne $null } | Select-Object -First 1
if (-not $release) {
    throw 'Unable to determine latest LTS release from Node.js distribution index.'
}

$version = $release.version
$zipUrl = "https://nodejs.org/dist/$version/node-$version-win-x64.zip"
Write-Host "Found latest LTS version: $version"
Write-Host "Downloading Node.js from $zipUrl..."
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing -ErrorAction Stop

if (Test-Path $extractDir) {
    Write-Host "Removing existing portable node directory: $extractDir"
    Remove-Item -Recurse -Force $extractDir
}

Write-Host "Extracting Node.js to $extractDir..."
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
Remove-Item $zipPath

Write-Host "Node.js portable install complete."
Write-Host "Run .\run-server.ps1 to start the backend using the portable Node runtime."
