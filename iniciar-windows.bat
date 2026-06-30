@echo off
REM ============================================================
REM  Contabilis - iniciar ambiente de desenvolvimento
REM  Basta dar um duplo-clique neste arquivo.
REM  Sobe a API e o frontend (npm run dev) e abre o Chrome
REM  em http://contabilis.local. O ambiente precisa ja estar
REM  instalado (rode setup-windows.bat da primeira vez).
REM ============================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-windows.ps1" %*
