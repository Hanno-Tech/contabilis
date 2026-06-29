@echo off
REM ============================================================
REM  Contabilis - desinstalacao no Windows
REM  Duplo-clique para rodar. Pergunta antes de remover Node,
REM  Git e PostgreSQL (que podem ser usados por outros projetos).
REM  Para remover TUDO sem perguntar, rode em um terminal:
REM    powershell -ExecutionPolicy Bypass -File uninstall-windows.ps1 -All -Force
REM ============================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall-windows.ps1" %*
echo.
pause
