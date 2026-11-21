@echo off
rem ============================================================
rem  SC-TCG  -  YEREL SUNUCUYU BASLAT
rem  Cift tikla -> sunucu acilir ve tarayici kendiliginden gelir:
rem                 http://localhost:4173/
rem  Bu pencereyi kapatmak sunucuyu da kapatir.
rem ============================================================
setlocal
cd /d "%~dp0"
set "NODE=%~dp0_tools\node-win-x64\node.exe"
if not exist "%NODE%" set "NODE=node"
if not exist "%NODE%" (
  echo [X] Node bulunamadi. _tools\node-win-x64\node.exe dosyasi eksik.
  echo     Beklenen konum: %~dp0_tools\node-win-x64\node.exe
  pause
  exit /b 1
)
echo.
echo  SC-TCG yerel sunucu baslatiliyor...
echo  Site adresi : http://localhost:4173/
echo  Dev paneli  : http://localhost:4173/?dev=1
echo  404 listesi : http://localhost:4173/_local-status
echo  Kapatmak    : bu pencereyi kapat (veya Ctrl+C)
echo.
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:4173/"
"%NODE%" "%~dp0server.js" 4173
pause
