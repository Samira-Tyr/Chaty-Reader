$ErrorActionPreference = "Stop"

$installRoot = Join-Path $env:LOCALAPPDATA "Chaty Reader"
$desktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "Chaty Reader.lnk"
$startMenuFolder = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Chaty Reader"

if (Test-Path $desktopShortcut) {
  Remove-Item $desktopShortcut -Force
}
if (Test-Path $startMenuFolder) {
  Remove-Item $startMenuFolder -Recurse -Force
}

if (Test-Path $installRoot) {
  $escaped = $installRoot.Replace('"', '""')
  Start-Process cmd.exe -WindowStyle Hidden -ArgumentList "/c timeout /t 2 /nobreak >nul & rmdir /s /q `"$escaped`""
}

Write-Host "Chaty Reader se ha desinstalado." -ForegroundColor Cyan
