<#
.SYNOPSIS
    Para o Contabilis que esta rodando em segundo plano (iniciar-windows).

.DESCRIPTION
    Encerra os processos que estao escutando nas portas do backend e do
    frontend (e seus filhos node). Auto-eleva para Administrador porque o
    frontend roda na porta 80.

.NOTES
    Uso:  duplo-clique em  parar-windows.bat
#>

[CmdletBinding()]
param(
    [string] $ProjectDir   = $PSScriptRoot,
    [int]    $FrontendPort = 80,
    [int]    $BackendPort  = 3333
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

# $PSScriptRoot pode vir vazio dependendo de como o script foi disparado/elevado.
if ([string]::IsNullOrWhiteSpace($ProjectDir)) {
    $ProjectDir =
        if    ($PSScriptRoot)   { $PSScriptRoot }
        elseif ($PSCommandPath) { Split-Path -Parent $PSCommandPath }
        else                    { (Get-Location).Path }
}
$ProjectDir = $ProjectDir.TrimEnd('\')

function Write-Info([string]$Message) { Write-Host "    $Message" -ForegroundColor DarkGray }
function Write-Ok([string]$Message)   { Write-Host "    [ok] $Message" -ForegroundColor Green }

# Auto-elevacao para Administrador (porta 80).
$principal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Host 'Solicitando privilegios de Administrador...' -ForegroundColor Yellow
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass',
        '-File', "`"$PSCommandPath`"",
        '-ProjectDir', "`"$ProjectDir`"",
        '-FrontendPort', $FrontendPort,
        '-BackendPort', $BackendPort
    )
    return
}

try {

Write-Host '================================================================' -ForegroundColor White
Write-Host '  Contabilis -- parar ambiente de desenvolvimento' -ForegroundColor White
Write-Host '================================================================' -ForegroundColor White

$logDir   = Join-Path $ProjectDir 'logs'
$stopFlag = Join-Path $logDir 'stop.flag'
$pidFile  = Join-Path $logDir 'supervisor.pids'

# 1. Cria o sinal de parada: os supervisores que estiverem vivos veem o flag e
#    encerram sozinhos, em vez de reiniciar o servico que vamos matar a seguir.
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
Set-Content -Path $stopFlag -Value 'stop' -Encoding ascii
Write-Info 'Sinal de parada enviado aos supervisores.'

# 2. Encerra os supervisores pelo PID registrado (impede que ressuscitem a API).
if (Test-Path $pidFile) {
    foreach ($line in (Get-Content $pidFile)) {
        $procId = ($line -as [int])
        if ($procId -and $procId -gt 4) {
            & taskkill /PID $procId /T /F *> $null
        }
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Write-Ok 'Supervisores encerrados.'
}

# 3. Mata o que ainda estiver escutando nas portas (taskkill /T pega os filhos).
$stopped = $false
foreach ($port in @($BackendPort, $FrontendPort)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    if (-not $procIds) { Write-Info "Porta $port -- nada escutando."; continue }
    foreach ($procId in $procIds) {
        if ($procId -le 4) { continue }   # ignora System/Idle
        & taskkill /PID $procId /T /F *> $null
        Write-Ok "Porta $port -- processo $procId encerrado."
        $stopped = $true
    }
}

if (-not $stopped) {
    Write-Info 'Nenhum processo do Contabilis estava em execucao.'
} else {
    Write-Host ''
    Write-Host '    Contabilis parado.' -ForegroundColor Green
}

}
catch {
    Write-Host ''
    Write-Host "Erro ao parar: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Write-Host ''
    Read-Host 'Pressione Enter para fechar esta janela'
}
