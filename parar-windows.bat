@echo off
REM ============================================================
REM  Contabilis - parar ambiente de desenvolvimento
REM  Encerra a API e o frontend que rodam em segundo plano.
REM  Basta dar um duplo-clique neste arquivo.
REM ============================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0parar-windows.ps1" %*
