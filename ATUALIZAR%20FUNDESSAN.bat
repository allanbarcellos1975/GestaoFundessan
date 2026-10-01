@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Sistema Gestao Fundessan - Atualizador Incremental v1

REM ============================================================
REM SISTEMA GESTAO FUNDESSAN - ATUALIZADOR INCREMENTAL v1
REM
REM - Procura o FUNDESSAN_PATCH_*.zip mais recente
REM - O ZIP deve conter a pasta src\ na raiz
REM - Copia SOMENTE os arquivos existentes no patch
REM - Mantem todos os demais arquivos do projeto intactos
REM - NAO cria backup
REM - NAO apaga arquivos
REM ============================================================

set "PROJETO=C:\Projetos\GestaoFundessan"
set "DESTINO=%PROJETO%\src"
set "DOWNLOADS=%USERPROFILE%\Downloads"
set "TEMP_PATCH=%TEMP%\Fundessan_Patch_Atualizacao"

echo.
echo ============================================================
echo   SISTEMA GESTAO FUNDESSAN - ATUALIZADOR INCREMENTAL v1
echo ============================================================
echo.

if not exist "%PROJETO%\" (
    echo [ERRO] Pasta do projeto nao encontrada:
    echo        %PROJETO%
    echo.
    pause
    exit /b 1
)

if not exist "%DESTINO%\" (
    echo [ERRO] Pasta src do projeto nao encontrada:
    echo        %DESTINO%
    echo.
    pause
    exit /b 1
)

if not exist "%DOWNLOADS%\" (
    echo [ERRO] Pasta Downloads nao encontrada:
    echo        %DOWNLOADS%
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM LOCALIZA O PATCH MAIS RECENTE
REM ============================================================

set "PATCH="

for /f "delims=" %%F in ('dir /b /a-d /o-d "%DOWNLOADS%\FUNDESSAN_PATCH_*.zip" 2^>nul') do (
    if not defined PATCH set "PATCH=%DOWNLOADS%\%%F"
)

if not defined PATCH (
    echo [ERRO] Nenhum patch encontrado em:
    echo        %DOWNLOADS%
    echo.
    echo O arquivo deve seguir o padrao:
    echo FUNDESSAN_PATCH_*.zip
    echo.
    pause
    exit /b 1
)

echo Patch encontrado:
echo %PATCH%
echo.

REM ============================================================
REM LIMPA E CRIA A PASTA TEMPORARIA
REM ============================================================

if exist "%TEMP_PATCH%\" (
    rmdir /s /q "%TEMP_PATCH%"
)

mkdir "%TEMP_PATCH%" >nul 2>&1

REM ============================================================
REM EXTRAI O ZIP
REM ============================================================

echo Extraindo patch...

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%PATCH%' -DestinationPath '%TEMP_PATCH%' -Force"

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao extrair o patch.
    if exist "%TEMP_PATCH%\" rmdir /s /q "%TEMP_PATCH%"
    echo.
    pause
    exit /b 1
)

if not exist "%TEMP_PATCH%\src\" (
    echo.
    echo [ERRO] O patch nao contem a pasta src na raiz.
    echo.
    echo Estrutura esperada:
    echo FUNDESSAN_PATCH_*.zip
    echo   ^|-- src\
    echo       ^|-- ...
    echo.
    if exist "%TEMP_PATCH%\" rmdir /s /q "%TEMP_PATCH%"
    pause
    exit /b 1
)

REM ============================================================
REM COPIA SOMENTE O QUE EXISTE NO PATCH
REM ============================================================

echo.
echo Atualizando arquivos...
echo.

robocopy "%TEMP_PATCH%\src" "%DESTINO%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS /NP

set "RC=%ERRORLEVEL%"

REM Codigos 0 a 7 do Robocopy representam sucesso/avisos normais.
if %RC% GEQ 8 (
    echo.
    echo [ERRO] Falha ao copiar os arquivos.
    echo Codigo Robocopy: %RC%
    if exist "%TEMP_PATCH%\" rmdir /s /q "%TEMP_PATCH%"
    echo.
    pause
    exit /b %RC%
)

REM ============================================================
REM LIMPEZA
REM ============================================================

if exist "%TEMP_PATCH%\" (
    rmdir /s /q "%TEMP_PATCH%"
)

echo.
echo ============================================================
echo   ATUALIZACAO CONCLUIDA COM SUCESSO
echo ============================================================
echo.
echo Somente os arquivos presentes no patch foram atualizados.
echo Nenhum outro arquivo da pasta src foi apagado.
echo.
echo Patch aplicado:
echo %PATCH%
echo.
echo Se o sistema estiver aberto no navegador, use Ctrl + F5.
echo.
pause
exit /b 0
