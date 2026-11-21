# SC-TCG - yerel sunucuyu kapatir.
# Sadece BU klasordeki _tools\node-win-x64\node.exe ile calisan sunucuyu oldurur;
# bilgisayardaki baska node uygulamalarina dokunmaz.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodePath = Join-Path $here '_tools\node-win-x64\node.exe'
$procs = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $nodePath }
if (-not $procs) { Write-Host "Calisan SC-TCG sunucusu bulunamadi (zaten kapali olabilir)." -ForegroundColor Yellow; exit 0 }
foreach ($p in $procs) {
  Write-Host ("  kapatiliyor: PID " + $p.Id) -ForegroundColor Cyan
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 400
$kalan = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $nodePath }
if ($kalan) { Write-Host "Kapatilamadilar: " ($kalan.Id -join ', ') -ForegroundColor Red; exit 1 }
Write-Host "Sunucu kapatildi." -ForegroundColor Green
