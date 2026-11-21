@echo off
rem ============================================================
rem  SC-TCG  -  YEREL SUNUCU (TELEFONDAN / AGDAN ERISIM)
rem  Ayni Wi-Fi'daki telefon veya baska bilgisayardan da acilir.
rem  Konsolda yazan "http://192.168.x.x:4173/" adresini o cihaza yaz.
rem  NOT: Windows ilk seferde "Izin ver" diye sorabilir -> Izin ver.
rem ============================================================
setlocal
cd /d "%~dp0"
set "NODE=%~dp0_tools\node-win-x64\node.exe"
if not exist "%NODE%" set "NODE=node"
echo.
echo  Ag icin sunucu baslatiliyor (port 4173)...
echo  Konsolda yazan http://192.168.x.x:4173/ adresini telefona yaz.
echo.
"%NODE%" "%~dp0server.js" 4173 --lan
pause
