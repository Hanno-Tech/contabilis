<#
.SYNOPSIS
    Desinstala o Contabilis de uma máquina Windows (desfaz o setup-windows.ps1).

.DESCRIPTION
    Remove tudo o que o instalador criou:

      1. Encerra a API e o App (processos node em execução na pasta do projeto).
      2. Remove o alias http://contabilis.local do arquivo hosts.
      3. Apaga o banco e o usuário "contabilis" do PostgreSQL.
      4. Apaga a pasta do projeto clonado.
      5. (Opcional) Desinstala PostgreSQL, Node.js, Git e o próprio Chocolatey.

    Por segurança, os passos 1–4 (específicos do app) rodam direto, mas a
    desinstalação dos programas do sistema (passo 5) é PERGUNTADA — afinal Node,
    Git e PostgreSQL podem estar em uso por outros projetos. Use as flags
    abaixo para rodar sem perguntas.

.NOTES
    Uso interativo:  rode  uninstall-windows.bat  (duplo-clique).
    Tirar TUDO sem perguntar:   .\uninstall-windows.ps1 -All -Force
    Tirar só o app, manter programas:   .\uninstall-windows.ps1 -KeepPackages -Force
#>

[CmdletBinding()]
param(
    [string]$InstallDir = (Join-Path $env:USERPROFILE 'contabilis'),
    [string]$AliasHost  = 'contabilis.local',
    [int]   $FrontendPort = 80,
    [int]   $BackendPort  = 3333,

    [string]$DbName = 'contabilis',
    [string]$DbUser = 'contabilis',
    [int]   $DbPort = 5432,
    [string]$PgSuperPassword = 'postgres',

    # O que fazer com os programas de sistema instalados pelo setup:
    [switch]$RemovePostgres,    # desinstala o PostgreSQL
    [switch]$RemoveNode,        # desinstala o Node.js
    [switch]$RemoveGit,         # desinstala o Git
    [switch]$RemoveChocolatey,  # desinstala o Chocolatey
    [switch]$All,               # = -RemovePostgres -RemoveNode -RemoveGit -RemoveChocolatey
    [switch]$KeepPackages,      # mantém todos os programas (não pergunta)
    [switch]$KeepDatabaseServer,# alias legado para -KeepPackages no Postgres
    [switch]$Force              # não pede confirmação
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$m) { Write-Host ''; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok([string]$m)   { Write-Host "    [ok] $m" -ForegroundColor Green }
function Write-Info([string]$m) { Write-Host "    $m" -ForegroundColor DarkGray }
function Write-Warn([string]$m) { Write-Host "    [!] $m" -ForegroundColor Yellow }

# Pergunta sim/não, a menos que -Force ou flags já tenham decidido.
function Confirm-Action([string]$question, [bool]$preset) {
    if ($preset) { return $true }
    if ($Force)  { return $false }
    $ans = Read-Host "$question [s/N]"
    return ($ans -match '^[sSyY]')
}

# ----------------------------------------------------------------------------
# Auto-elevação para Administrador
# ----------------------------------------------------------------------------
$principal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Host 'Solicitando privilégios de Administrador...' -ForegroundColor Yellow
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"",
        '-InstallDir', "`"$InstallDir`"", '-AliasHost', "`"$AliasHost`"",
        '-FrontendPort', $FrontendPort, '-BackendPort', $BackendPort,
        '-DbName', "`"$DbName`"", '-DbUser', "`"$DbUser`"", '-DbPort', $DbPort,
        '-PgSuperPassword', "`"$PgSuperPassword`"")
    if ($RemovePostgres)   { $argList += '-RemovePostgres' }
    if ($RemoveNode)       { $argList += '-RemoveNode' }
    if ($RemoveGit)        { $argList += '-RemoveGit' }
    if ($RemoveChocolatey) { $argList += '-RemoveChocolatey' }
    if ($All)              { $argList += '-All' }
    if ($KeepPackages)     { $argList += '-KeepPackages' }
    if ($Force)            { $argList += '-Force' }
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argList
    return
}

if ($All) { $RemovePostgres = $true; $RemoveNode = $true; $RemoveGit = $true; $RemoveChocolatey = $true }

try {

Write-Host '================================================================' -ForegroundColor White
Write-Host '  Contabilis — desinstalação' -ForegroundColor White
Write-Host '================================================================' -ForegroundColor White
Write-Info "Pasta do projeto : $InstallDir"
Write-Info "Alias            : http://$AliasHost"
if (-not $Force) {
    if (-not (Confirm-Action 'Continuar com a desinstalação?' $false)) {
        Write-Warn 'Cancelado pelo usuário.'; return
    }
}

# ----------------------------------------------------------------------------
# 1. Encerrar a API e o App
# ----------------------------------------------------------------------------
Write-Step 'Encerrando processos da aplicação'
$killed = 0

# (a) processos node cuja linha de comando aponta para a pasta do projeto.
try {
    $escaped = [regex]::Escape($InstallDir)
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -match $escaped } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $killed++ }
} catch {}

# (b) quem estiver escutando as portas do app (fallback).
foreach ($port in @($FrontendPort, $BackendPort)) {
    try {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -Expand OwningProcess -Unique |
            ForEach-Object {
                $p = Get-Process -Id $_ -ErrorAction SilentlyContinue
                if ($p -and $p.ProcessName -in @('node', 'cmd', 'conhost')) {
                    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; $killed++
                }
            }
    } catch {}
}
Write-Ok "$killed processo(s) encerrado(s)."

# ----------------------------------------------------------------------------
# 2. Remover o alias do arquivo hosts
# ----------------------------------------------------------------------------
Write-Step "Removendo o alias http://$AliasHost do hosts"
$hostsFile = Join-Path $env:windir 'System32\drivers\etc\hosts'
if (Test-Path $hostsFile) {
    $lines = Get-Content $hostsFile
    $kept = $lines | Where-Object {
        $_ -notmatch "\s$([regex]::Escape($AliasHost))(\s|$)" -and
        $_ -notmatch '^\s*#\s*Contabilis \(alias local\)\s*$'
    }
    if ($kept.Count -ne $lines.Count) {
        Set-Content -Path $hostsFile -Value $kept -Encoding ascii
        Write-Ok 'Alias removido do hosts.'
    } else { Write-Ok 'Nenhuma entrada de alias encontrada.' }
}

# ----------------------------------------------------------------------------
# 3. Apagar o banco e o usuário da aplicação
# ----------------------------------------------------------------------------
Write-Step 'Removendo o banco e o usuário do PostgreSQL'
$psql = Get-Command psql -ErrorAction SilentlyContinue | Select-Object -First 1 -Expand Source
if (-not $psql) {
    $psql = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1 -Expand FullName
}
if ($psql) {
    $pgService = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgService -and $pgService.Status -ne 'Running') { Start-Service $pgService.Name }
    $env:PGPASSWORD = $PgSuperPassword
    $base = @('-v', 'ON_ERROR_STOP=1', '-h', 'localhost', '-p', "$DbPort", '-U', 'postgres', '-d', 'postgres')
    & $psql @base -tAc 'SELECT 1' *> $null
    if ($LASTEXITCODE -eq 0) {
        & $psql @base -c "DROP DATABASE IF EXISTS $DbName WITH (FORCE);" 2>$null
        if ($LASTEXITCODE -ne 0) {
            # Fallback para PostgreSQL < 13 (sem WITH FORCE).
            & $psql @base -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName';" *> $null
            & $psql @base -c "DROP DATABASE IF EXISTS $DbName;" 2>$null
        }
        & $psql @base -c "DROP ROLE IF EXISTS $DbUser;" 2>$null
        Write-Ok "Banco e role '$DbName' removidos."
    } else {
        Write-Warn 'Não foi possível conectar ao PostgreSQL — pulei a remoção do banco.'
    }
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
} else {
    Write-Info 'psql não encontrado — PostgreSQL provavelmente já não está instalado.'
}

# ----------------------------------------------------------------------------
# 4. Apagar a pasta do projeto
# ----------------------------------------------------------------------------
Write-Step 'Removendo a pasta do projeto'
if (Test-Path $InstallDir) {
    if (Confirm-Action "Apagar definitivamente '$InstallDir'?" $true) {
        Remove-Item -LiteralPath $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
        if (Test-Path $InstallDir) {
            Write-Warn "Não foi possível apagar tudo (arquivo em uso?). Tente de novo após fechar editores/terminais."
        } else { Write-Ok "Pasta '$InstallDir' removida." }
    } else { Write-Info 'Pasta mantida.' }
} else { Write-Ok 'Pasta do projeto já não existe.' }

# ----------------------------------------------------------------------------
# 5. Desinstalar os programas de sistema (opcional)
# ----------------------------------------------------------------------------
Write-Step 'Programas de sistema (PostgreSQL / Node.js / Git / Chocolatey)'
if ($KeepPackages) {
    Write-Info 'Mantendo todos os programas (-KeepPackages).'
} else {
    $choco = Get-Command choco -ErrorAction SilentlyContinue
    if (-not $choco) {
        Write-Info 'Chocolatey não encontrado — não há como desinstalar os pacotes por aqui.'
    } else {
        if (Confirm-Action 'Desinstalar o PostgreSQL?' $RemovePostgres) {
            choco uninstall postgresql -y --no-progress 2>$null
            Write-Ok 'PostgreSQL desinstalado (a pasta de dados pode permanecer).'
        }
        if (Confirm-Action 'Desinstalar o Node.js?' $RemoveNode) {
            choco uninstall nodejs-lts nodejs -y --no-progress 2>$null
            Write-Ok 'Node.js desinstalado.'
        }
        if (Confirm-Action 'Desinstalar o Git?' $RemoveGit) {
            choco uninstall git -y --no-progress 2>$null
            Write-Ok 'Git desinstalado.'
        }
        if (Confirm-Action 'Desinstalar o próprio Chocolatey?' $RemoveChocolatey) {
            $chocoDir = $env:ChocolateyInstall
            if (-not $chocoDir) { $chocoDir = 'C:\ProgramData\chocolatey' }
            if (Test-Path $chocoDir) { Remove-Item -LiteralPath $chocoDir -Recurse -Force -ErrorAction SilentlyContinue }
            Write-Ok 'Chocolatey removido.'
        }
    }
}

Write-Host ''
Write-Host '================================================================' -ForegroundColor Green
Write-Host '  Desinstalação concluída.' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Green

}
catch {
    Write-Host ''
    Write-Host '  A DESINSTALAÇÃO FALHOU' -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.InvocationInfo) {
        Write-Host "Em   : linha $($_.InvocationInfo.ScriptLineNumber) — $($_.InvocationInfo.Line.Trim())" -ForegroundColor DarkYellow
    }
}
finally {
    Write-Host ''
    Read-Host 'Pressione Enter para fechar esta janela'
}
