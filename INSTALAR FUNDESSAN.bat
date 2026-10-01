@echo off
setlocal EnableExtensions
cd /d C:\Projetos\GestaoFundessan

echo.
echo ============================================================
echo   SISTEMA GESTAO FUNDESSAN - INSTALACAO DA BASE
echo ============================================================
echo.

if not exist "package.json" (
  echo [ERRO] package.json nao encontrado.
  pause
  exit /b 1
)

if not exist "src\" (
  echo [ERRO] pasta src nao encontrada.
  pause
  exit /b 1
)

echo [1/2] Instalando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [ERRO] npm install falhou.
  pause
  exit /b 1
)

echo.
echo [2/2] Validando compilacao...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERRO] npm run build falhou.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   BASE INSTALADA E VALIDADA COM SUCESSO
echo ============================================================
echo.
echo Agora use ABRIR FUNDESSAN.bat.
echo.
pause
exit /b 0
