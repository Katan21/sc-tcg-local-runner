@echo off
rem ============================================================
rem  SC-TCG  -  v2 ARAYUZ (AMBER HUD) ILE BASLAT
rem  Cift tikla -> tarayici http://localhost:4173/v2/ adresinde acilir.
rem  v1 (orijinal) icin:  baslat.bat
rem  Sag alttaki "ARAYUZ" seciciden istegini gibi v1/v2 gecisi yapabilirsin.
rem ============================================================
setlocal
cd /d "%~dp0"
set "NODE=%~dp0_tools\node-win-x64\node.exe"
if not exist "%NODE%" set "NODE=node"
if not exist "%NODE%" (
  echo [X] Node bulunamadi. _tools\node-win-x64\node.exe eksik.
  pause
  exit /b 1
)
if not exist "%~dp0v2\v2.css" (
  echo [X] v2 klasoru eksik: %~dp0v2
  pause
  exit /b 1
)
echo.
echo  SC-TCG yerel sunucu (v2 arayuzu) baslatiliyor...
echo  v2 adresi : http://localhost:4173/v2/
echo  v1 adresi : http://localhost:4173/
echo  Kapatmak  : bu pencereyi kapat (veya kapat.bat)
echo.
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:4173/v2/"
"%NODE%" "%~dp0server.js" 4173
pause
