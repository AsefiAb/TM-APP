# Rasterize the checked-in official SAM AI vector using a build-time Sharp module.
# Example: ./assets/generate-assets.ps1 -SharpModule C:/tools/node_modules/sharp
# Sharp is only used by this developer script; it is not an app dependency.
param([string]$SharpModule = 'sharp', [string]$Node = 'node')
$ErrorActionPreference = 'Stop'
& $Node (Join-Path $PSScriptRoot 'generate-assets.cjs') $SharpModule
if ($LASTEXITCODE -ne 0) { throw 'SAM asset generation failed.' }
