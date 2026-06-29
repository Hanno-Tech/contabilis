@echo off
REM ============================================================
REM  Contabilis - instalacao do zero no Windows
REM  Basta dar um duplo-clique neste arquivo.
REM  Ele executa o setup-windows.ps1 que esta na mesma pasta,
REM  liberando a politica de execucao do PowerShell.
REM ============================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1" %*
echo.
pause
