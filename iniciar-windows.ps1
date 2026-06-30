<#
.SYNOPSIS
    Sobe o Contabilis em modo desenvolvimento no Windows e abre o navegador.

.DESCRIPTION
    Para um ambiente JA instalado (use setup-windows.ps1 da primeira vez).
    Este script:

      1. Garante o alias http://contabilis.local no arquivo hosts.
      2. Sobe o backend (API) com "npm run dev" numa janela separada.
      3. Sobe o frontend (app) com "npm run dev" na porta 80, em outra janela.
      4. Aguarda o app responder e abre o Google Chrome em http://contabilis.local.

    Ele se auto-eleva para Administrador (necessario para servir o app na
    porta 80 e editar o arquivo hosts, caso o alias ainda nao exista).

.NOTES
    Uso:  clique com o botao direito > "Executar com o PowerShell"
          ou rode  iniciar-windows.bat  (duplo-clique).
#>

[CmdletBinding()]
param(
    [string]$ProjectDir   = $PSScriptRoot,
    [string]$AliasHost    = 'contabilis.local',
    [int]   $FrontendPort = 80,
    [int]   $BackendPort  = 3333
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

# Resolve a pasta do projeto de forma robusta: $PSScriptRoot pode vir vazio
# dependendo de como o script foi disparado/elevado. Cai para o diretorio do
# proprio arquivo e, por fim, para o diretorio atual. Sem barra final (evita
# que a aspas de fechamento seja escapada ao repassar o argumento na elevacao).
if ([string]::IsNullOrWhiteSpace($ProjectDir)) {
    $ProjectDir =
        if    ($PSScriptRoot)   { $PSScriptRoot }
        elseif ($PSCommandPath) { Split-Path -Parent $PSCommandPath }
        else                    { (Get-Location).Path }
}
$ProjectDir = $ProjectDir.TrimEnd('\')

# ----------------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------------
function Write-Step([string]$Message) {
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}
function Write-Ok([string]$Message)   { Write-Host "    [ok] $Message" -ForegroundColor Green }
function Write-Info([string]$Message) { Write-Host "    $Message" -ForegroundColor DarkGray }
function Write-Warn([string]$Message) { Write-Host "    [aviso] $Message" -ForegroundColor Yellow }

# ----------------------------------------------------------------------------
# 0. Auto-elevacao para Administrador
# ----------------------------------------------------------------------------
$principal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Host 'Solicitando privilegios de Administrador...' -ForegroundColor Yellow
    $argList = @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass',
        '-File', "`"$PSCommandPath`"",
        '-ProjectDir', "`"$ProjectDir`"",
        '-AliasHost', "`"$AliasHost`"",
        '-FrontendPort', $FrontendPort,
        '-BackendPort', $BackendPort
    )
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argList
    return
}

try {

Write-Host '================================================================' -ForegroundColor White
Write-Host '  Contabilis -- iniciar ambiente de desenvolvimento' -ForegroundColor White
Write-Host '================================================================' -ForegroundColor White

$BackendDir  = Join-Path $ProjectDir 'backend'
$FrontendDir = Join-Path $ProjectDir 'frontend'
Write-Info "Projeto : $ProjectDir"
Write-Info "Alias   : http://$AliasHost"

if (-not (Test-Path $BackendDir))  { throw "Pasta do backend nao encontrada: $BackendDir" }
if (-not (Test-Path $FrontendDir)) { throw "Pasta do frontend nao encontrada: $FrontendDir" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js nao encontrado no PATH. Rode setup-windows.bat primeiro.'
}
if (-not (Test-Path (Join-Path $BackendDir 'node_modules'))) {
    Write-Warn 'backend/node_modules ausente -- rode setup-windows.bat (ou npm install) antes.'
}
if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
    Write-Warn 'frontend/node_modules ausente -- rode setup-windows.bat (ou npm install) antes.'
}

# ----------------------------------------------------------------------------
# 1. Alias no arquivo hosts
# ----------------------------------------------------------------------------
Write-Step "Verificando o alias http://$AliasHost"
$hostsFile = Join-Path $env:windir 'System32\drivers\etc\hosts'
$entry = "127.0.0.1`t$AliasHost"
$already = Select-String -Path $hostsFile -Pattern "\s$([regex]::Escape($AliasHost))(\s|$)" -ErrorAction SilentlyContinue
if (-not $already) {
    Add-Content -Path $hostsFile -Value "`r`n# Contabilis (alias local)`r`n$entry"
    Write-Ok 'Alias adicionado ao hosts.'
} else { Write-Ok 'Alias ja registrado no hosts.' }

# ----------------------------------------------------------------------------
# 2. Subir backend e frontend sob supervisao (ocultos; reinicia se cair/travar)
# ----------------------------------------------------------------------------
Write-Step 'Subindo a API e o App sob supervisao (ocultos)'

$logDir = Join-Path $ProjectDir 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$backendLog  = Join-Path $logDir 'backend.log'
$frontendLog = Join-Path $logDir 'frontend.log'
$stopFlag    = Join-Path $logDir 'stop.flag'
$pidFile     = Join-Path $logDir 'supervisor.pids'

$supervisor = Join-Path $ProjectDir 'supervisor-windows.ps1'
if (-not (Test-Path $supervisor)) { throw "supervisor-windows.ps1 nao encontrado em $ProjectDir" }

# Limpa o sinal de parada de uma execucao anterior, para os supervisores rodarem.
Remove-Item $stopFlag -ErrorAction SilentlyContinue

$appUrl = if ($FrontendPort -eq 80) { "http://$AliasHost" } else { "http://${AliasHost}:$FrontendPort" }

# Supervisor da API: monitora http://localhost:$BackendPort/api/health.
$bsup = Start-Process -FilePath 'powershell.exe' -PassThru -WindowStyle Hidden -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$supervisor`"",
    '-Name', 'API',
    '-WorkingDir', "`"$BackendDir`"",
    '-HealthUrl', "http://localhost:$BackendPort/api/health",
    '-LogFile', "`"$backendLog`"",
    '-StopFlag', "`"$stopFlag`""
)
Write-Ok "API sob supervisao em http://localhost:$BackendPort/api (log: logs\backend.log)"

# Supervisor do App: monitora a propria URL do app.
$fsup = Start-Process -FilePath 'powershell.exe' -PassThru -WindowStyle Hidden -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$supervisor`"",
    '-Name', 'App',
    '-WorkingDir', "`"$FrontendDir`"",
    '-HealthUrl', "$appUrl",
    '-LogFile', "`"$frontendLog`"",
    '-StopFlag', "`"$stopFlag`"",
    '-FrontendPort', $FrontendPort
)
Write-Ok 'App sob supervisao (log: logs\frontend.log).'

# Guarda os PIDs dos supervisores para o parar-windows encerra-los.
Set-Content -Path $pidFile -Value @($bsup.Id, $fsup.Id) -Encoding ascii

# ----------------------------------------------------------------------------
# 3. Aguardar o app responder e abrir o Chrome
# ----------------------------------------------------------------------------
Write-Step "Aguardando o app em $appUrl"
$up = $false
for ($i = 0; $i -lt 40; $i++) {
    try {
        Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 2 *> $null
        $up = $true; break
    } catch { Start-Sleep -Seconds 2 }
}
if ($up) { Write-Ok 'App respondeu.' } else { Write-Warn 'App ainda nao respondeu -- abrindo o navegador mesmo assim.' }

# Localiza o Google Chrome.
$chrome = $null
$chromeCandidates = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
foreach ($c in $chromeCandidates) {
    if ($c -and (Test-Path $c)) { $chrome = $c; break }
}
if (-not $chrome) {
    $reg = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe'
    if (Test-Path $reg) { $chrome = (Get-ItemProperty $reg).'(default)' }
}

if ($chrome) {
    Write-Ok "Abrindo o Chrome: $appUrl"
    Start-Process -FilePath $chrome -ArgumentList $appUrl
} else {
    Write-Warn 'Chrome nao encontrado -- abrindo no navegador padrao.'
    Start-Process $appUrl
}

Write-Host ''
Write-Host '================================================================' -ForegroundColor Green
Write-Host '  Contabilis em execucao.' -ForegroundColor Green
Write-Host "  App  : $appUrl" -ForegroundColor Green
Write-Host "  API  : http://localhost:$BackendPort/api" -ForegroundColor Green
Write-Host '  Login: gisele / contabilis   (ou admin / contabilis)' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Green
Write-Host 'API e App rodam ocultos em segundo plano, sob supervisao:' -ForegroundColor DarkGray
Write-Host '  reiniciam sozinhos se o processo cair ou parar de responder.' -ForegroundColor DarkGray
Write-Host 'Logs    : pasta logs\ (backend.log, frontend.log)' -ForegroundColor DarkGray
Write-Host 'Restarts: logs\backend.supervisor.log / frontend.supervisor.log' -ForegroundColor DarkGray
Write-Host 'Parar   : duplo-clique em parar-windows.bat' -ForegroundColor DarkGray

}
catch {
    Write-Host ''
    Write-Host '================================================================' -ForegroundColor Red
    Write-Host '  FALHA AO INICIAR' -ForegroundColor Red
    Write-Host '================================================================' -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.InvocationInfo) {
        Write-Host "Em   : linha $($_.InvocationInfo.ScriptLineNumber) -- $($_.InvocationInfo.Line.Trim())" -ForegroundColor DarkYellow
    }
}
finally {
    Write-Host ''
    Read-Host 'Pressione Enter para fechar esta janela'
}
