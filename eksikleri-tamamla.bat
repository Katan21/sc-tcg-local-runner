@echo off
rem ============================================================
rem  SC-TCG  -  EKSIK GORSEL / SESLERI CANLI SITEDEN TAMAMLAMA
rem  site\ kopyasinda olmayan dosyalari sc-tcg.gamer.free'den indirir.
rem  Internete ihtiyac var. Bir kere calistirmak yeter.
rem  (Raporlarda yazan 3 dosya canli sunucuda da yok: onlar "YOK" yazar.)
rem ============================================================
setlocal
cd /d "%~dp0"
set "NODE=%~dp0_tools\node-win-x64\node.exe"
if not exist "%NODE%" set "NODE=node"
echo.
echo  Eksik dosyalar canli siteden indiriliyor (biraz s??rebilir)...
echo.
"%NODE%" "%~dp0server.js" --fill
echo.
pause

