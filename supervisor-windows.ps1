<#
.SYNOPSIS
    Supervisor de um servico do Contabilis (API ou App) em modo dev.

.DESCRIPTION
    Sobe "npm run dev" oculto e fica vigiando. Reinicia o servico quando:
      - o processo morre (erro / crash); ou
      - o servico para de responder ao health check (travou).

    Roda em loop ate que o arquivo -StopFlag exista (criado por parar-windows).
    Nao deve ser chamado diretamente -- e disparado pelo iniciar-windows.ps1.

.NOTES
    Saida (stdout/stderr) do servico e mensagens do supervisor vao para -LogFile.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Name,        # rotulo nos logs (API / App)
    [Parameter(Mandatory)] [string] $WorkingDir,  # pasta com o package.json
    [Parameter(Mandatory)] [string] $HealthUrl,   # URL para o health check
    [Parameter(Mandatory)] [string] $LogFile,     # arquivo de log
    [Parameter(Mandatory)] [string] $StopFlag,    # se existir, encerra o loop
    [int] $FrontendPort = 0,                       # se > 0, define FRONTEND_PORT

    # Ajustes de tempo (segundos).
    [int] $PollInterval   = 5,    # intervalo entre health checks
    [int] $WarmupSeconds  = 180,  # tempo para o 1o "ok" antes de considerar travado
    [int] $FailSeconds    = 20    # tempo sem responder (apos ok) que dispara restart
)

$ErrorActionPreference = 'Continue'
$PSNativeCommandUseErrorActionPreference = $false

# O servico escreve em $LogFile (via *>>), mantendo o handle aberto. Para nao
# disputar esse arquivo, o supervisor registra seus eventos num log irmao.
$supLog = [IO.Path]::ChangeExtension($LogFile, $null).TrimEnd('.') + '.supervisor.log'

function Write-Log([string]$Message) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [supervisor:$Name] $Message"
    try { Add-Content -Path $supLog -Value $line -Encoding utf8 } catch { }
}

function Test-Health([string]$Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
    } catch { return $false }
}

# Encerra a arvore de processos do servico (powershell -> cmd -> node).
function Stop-Tree($Proc) {
    if ($Proc -and -not $Proc.HasExited) {
        & taskkill /PID $Proc.Id /T /F *> $null
    }
}

$warmupPolls = [Math]::Max(1, [int]($WarmupSeconds / $PollInterval))
$failPolls   = [Math]::Max(1, [int]($FailSeconds   / $PollInterval))

Write-Log "iniciando supervisao (health: $HealthUrl)"

$attempt = 0
while (-not (Test-Path $StopFlag)) {
    $attempt++
    if ($attempt -eq 1) { Write-Log 'subindo o servico (npm run dev)...' }
    else                { Write-Log "reiniciando o servico (tentativa #$attempt)..." }

    # Monta o comando do servico: opcionalmente define FRONTEND_PORT.
    $envPrefix = ''
    if ($FrontendPort -gt 0) { $envPrefix = "`$env:FRONTEND_PORT=$FrontendPort; " }
    $cmd = "$envPrefix Set-Location '$WorkingDir'; npm run dev *>> '$LogFile'"

    $child = $null
    try {
        $child = Start-Process -FilePath 'powershell.exe' -PassThru -WindowStyle Hidden `
            -ArgumentList @('-NoProfile', '-Command', $cmd)
    } catch {
        Write-Log "falha ao iniciar: $($_.Exception.Message)"
        Start-Sleep -Seconds $PollInterval
        continue
    }

    # Vigia ate cair, travar ou receber o sinal de parada.
    $healthy = $false
    $polls   = 0
    $fails   = 0
    $restart = $false

    while ($true) {
        Start-Sleep -Seconds $PollInterval

        if (Test-Path $StopFlag) { break }           # pedido de parada

        if ($child.HasExited) {                       # crash / saida com erro
            Write-Log "processo encerrou (exit code $($child.ExitCode)) -- vai reiniciar."
            $restart = $true; break
        }

        $polls++
        if (Test-Health $HealthUrl) {
            if (-not $healthy) { Write-Log 'servico respondendo (ok).' }
            $healthy = $true
            $fails = 0
        } else {
            if ($healthy) {
                # Ja esteve saudavel: contar falhas consecutivas (travou).
                $fails++
                if ($fails -ge $failPolls) {
                    Write-Log "sem resposta por ~$FailSeconds s -- travou; reiniciando."
                    Stop-Tree $child
                    $restart = $true; break
                }
            } elseif ($polls -ge $warmupPolls) {
                # Nunca respondeu dentro da janela de warmup.
                Write-Log "nao subiu em ~$WarmupSeconds s -- reiniciando."
                Stop-Tree $child
                $restart = $true; break
            }
        }
    }

    if (-not $restart) { break }                      # saiu por StopFlag
    Start-Sleep -Seconds 2                            # pequena pausa antes do restart
}

# Parada solicitada: garante que o servico foi encerrado.
Write-Log 'sinal de parada recebido -- encerrando o servico.'
if ($child) { Stop-Tree $child }
Write-Log 'supervisor finalizado.'
