$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$packageRoot = Split-Path -Parent $PSScriptRoot
$sourceApp = Join-Path $packageRoot "app"
$installRoot = Join-Path $env:LOCALAPPDATA "Chaty Reader"
$installApp = Join-Path $installRoot "app"
$desktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "Chaty Reader.lnk"
$startMenuFolder = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Chaty Reader"
$startMenuShortcut = Join-Path $startMenuFolder "Chaty Reader.lnk"
$uninstallShortcut = Join-Path $startMenuFolder "Desinstalar Chaty Reader.lnk"

if (-not (Test-Path $sourceApp)) {
  throw "No se encontro la carpeta de la aplicacion junto al instalador. Extrae primero todo el ZIP y vuelve a intentarlo."
}

$edgeCandidates = @()
if (${env:ProgramFiles(x86)}) {
  $edgeCandidates += Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"
}
if ($env:ProgramFiles) {
  $edgeCandidates += Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe"
}
if ($env:LOCALAPPDATA) {
  $edgeCandidates += Join-Path $env:LOCALAPPDATA "Microsoft\Edge\Application\msedge.exe"
}
$edge = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $edge) {
  throw "No se encontro Microsoft Edge. Windows 10 y 11 normalmente lo incluyen y la aplicacion lo usa solo como motor local."
}

if (Test-Path $installApp) {
  Remove-Item $installApp -Recurse -Force
}

New-Item -ItemType Directory -Path $installApp -Force | Out-Null
New-Item -ItemType Directory -Path $startMenuFolder -Force | Out-Null
Copy-Item (Join-Path $sourceApp "*") $installApp -Recurse -Force
Copy-Item (Join-Path $PSScriptRoot "Desinstalar.ps1") $installRoot -Force

$indexPath = Join-Path $installApp "index.html"
$indexUri = ([System.Uri]$indexPath).AbsoluteUri
$shell = New-Object -ComObject WScript.Shell

function New-AppShortcut([string]$shortcutPath) {
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $edge
  $shortcut.Arguments = "--app=`"$indexUri`" --start-maximized"
  $shortcut.WorkingDirectory = $installApp
  $shortcut.IconLocation = "$edge,0"
  $shortcut.Description = "Decodifica y lee exportaciones conversacionales en local"
  $shortcut.Save()
}

New-AppShortcut $desktopShortcut
New-AppShortcut $startMenuShortcut

$uninstall = $shell.CreateShortcut($uninstallShortcut)
$uninstall.TargetPath = "powershell.exe"
$uninstall.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $installRoot 'Desinstalar.ps1')`""
$uninstall.WorkingDirectory = $installRoot
$uninstall.IconLocation = "$edge,0"
$uninstall.Save()

Write-Host "Chaty Reader se ha instalado para este usuario." -ForegroundColor Cyan
Write-Host "Tus conversaciones nunca se copian a la carpeta de la aplicacion." -ForegroundColor DarkCyan
Start-Process $edge -ArgumentList "--app=`"$indexUri`" --start-maximized"
