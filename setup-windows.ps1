<#
.SYNOPSIS
    Instalacao do zero do Contabilis em uma maquina Windows.

.DESCRIPTION
    Faz TUDO, sem precisar de Node, Docker ou qualquer pre-requisito instalado:

      1. Instala o Chocolatey (gerenciador de pacotes do Windows).
      2. Instala Git, Node.js LTS e PostgreSQL (nativo, sem Docker).
      3. Cria o usuario e o banco "contabilis" no PostgreSQL.
      4. Clona https://github.com/Hanno-Tech/contabilis.git.
      5. Gera os arquivos .env do backend e do frontend.
      6. Instala dependencias, roda as migrations e o seed.
      7. Cria o alias http://contabilis.local no arquivo hosts.
      8. Sobe o backend (API) e o frontend (app) em janelas separadas.
      9. Abre o navegador em http://contabilis.local.

    O script e idempotente: pode ser executado varias vezes sem efeitos colaterais.
    Ele se auto-eleva para Administrador (necessario para instalar programas,
    editar o arquivo hosts e servir o app na porta 80).

.NOTES
    Uso:  clique com o botao direito > "Executar com o PowerShell"
          ou rode  setup-windows.bat  (que cuida da politica de execucao).
#>

[CmdletBinding()]
param(
    [string]$RepoUrl     = 'https://github.com/Hanno-Tech/contabilis.git',
    [string]$InstallDir  = (Join-Path $env:USERPROFILE 'contabilis'),
    [string]$AliasHost   = 'contabilis.local',
    [int]   $FrontendPort = 80,
    [int]   $BackendPort  = 3333,

    # Credenciais do banco da aplicacao (devem casar com o DATABASE_URL do .env).
    [string]$DbName      = 'contabilis',
    [string]$DbUser      = 'contabilis',
    [string]$DbPassword  = 'contabilis',
    [int]   $DbPort      = 5432,

    # Senha do superusuario "postgres" definida na instalacao do PostgreSQL.
    [string]$PgSuperPassword = 'postgres'
)

$ErrorActionPreference = 'Stop'
# No PowerShell 7.3+ um exit code != 0 de programa externo vira erro terminante
# quando ErrorActionPreference = Stop. Desligamos isso para poder checar o
# $LASTEXITCODE do psql nos lacos (testar senhas, esperar o servidor subir).
# (variavel inexistente no Windows PowerShell 5.1 -- atribuicao e inofensiva la)
$PSNativeCommandUseErrorActionPreference = $false

# ----------------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------------
function Write-Step([string]$Message) {
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}
function Write-Ok([string]$Message)   { Write-Host "    [ok] $Message" -ForegroundColor Green }
function Write-Info([string]$Message) { Write-Host "    $Message" -ForegroundColor DarkGray }

# Recarrega o PATH (Machine + User) na sessao atual, para que programas recem
# instalados pelo Chocolatey fiquem disponiveis sem reiniciar o terminal.
function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = ($machine, $user | Where-Object { $_ }) -join ';'
}

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
        '-RepoUrl', "`"$RepoUrl`"",
        '-InstallDir', "`"$InstallDir`"",
        '-AliasHost', "`"$AliasHost`"",
        '-FrontendPort', $FrontendPort,
        '-BackendPort', $BackendPort,
        '-DbName', "`"$DbName`"",
        '-DbUser', "`"$DbUser`"",
        '-DbPassword', "`"$DbPassword`"",
        '-DbPort', $DbPort,
        '-PgSuperPassword', "`"$PgSuperPassword`""
    )
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argList
    return
}

try {

Write-Host '================================================================' -ForegroundColor White
Write-Host '  Contabilis -- instalacao do zero no Windows' -ForegroundColor White
Write-Host '================================================================' -ForegroundColor White
Write-Info "Repositorio : $RepoUrl"
Write-Info "Destino     : $InstallDir"
Write-Info "Alias       : http://$AliasHost"

# ----------------------------------------------------------------------------
# 1. Chocolatey
# ----------------------------------------------------------------------------
Write-Step 'Verificando o Chocolatey'
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Info 'Instalando o Chocolatey...'
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol =
        [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Update-SessionPath
    Write-Ok 'Chocolatey instalado.'
} else {
    Write-Ok 'Chocolatey ja presente.'
}

# ----------------------------------------------------------------------------
# 2. Git, Node.js LTS e PostgreSQL
# ----------------------------------------------------------------------------
Write-Step 'Instalando Git, Node.js LTS e PostgreSQL'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y --no-progress
} else { Write-Ok 'Git ja presente.' }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y --no-progress
} else { Write-Ok "Node.js ja presente ($(node -v))." }

# PostgreSQL nativo (substitui o Docker). A senha do superusuario "postgres"
# e definida aqui para que possamos criar o banco da aplicacao em seguida.
$pgInstalled = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue
if (-not $pgInstalled) {
    choco install postgresql -y --no-progress --params "/Password:$PgSuperPassword"
} else { Write-Ok 'PostgreSQL ja presente.' }

Update-SessionPath
Write-Ok 'Pacotes instalados.'

# ----------------------------------------------------------------------------
# 3. Configurar o banco da aplicacao
# ----------------------------------------------------------------------------
Write-Step 'Configurando o banco PostgreSQL'

# Garante o servico rodando.
$pgService = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($pgService -and $pgService.Status -ne 'Running') {
    Start-Service $pgService.Name
    Write-Info "Servico $($pgService.Name) iniciado."
}

# Localiza o psql.exe da maior versao instalada.
$psql = Get-Command psql -ErrorAction SilentlyContinue | Select-Object -First 1 -Expand Source
if (-not $psql) {
    $psql = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1 -Expand FullName
}
if (-not $psql) { throw 'psql.exe nao encontrado -- verifique a instalacao do PostgreSQL.' }
Write-Info "psql: $psql"

$psqlBase = @('-v', 'ON_ERROR_STOP=1', '-h', 'localhost', '-p', "$DbPort", '-U', 'postgres', '-d', 'postgres')

# Tenta conectar testando as senhas mais comuns. Cobre:
#  - a senha que ESTE script define ao instalar ('postgres');
#  - o default do pacote Chocolatey do PostgreSQL ('Postgres1234');
#  - uma senha informada via -PgSuperPassword.
# O laco tambem da tempo para um servidor recem-instalado terminar de subir.
$pgCandidates = @($PgSuperPassword, 'postgres', 'Postgres1234') |
    Where-Object { $_ } | Select-Object -Unique
$ready = $false
for ($i = 0; $i -lt 20 -and -not $ready; $i++) {
    foreach ($pw in $pgCandidates) {
        $env:PGPASSWORD = $pw
        & $psql @psqlBase -tAc 'SELECT 1' *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; $PgSuperPassword = $pw; break }
    }
    if (-not $ready) { Start-Sleep -Seconds 2 }
}

# Ainda sem conexao: a senha do 'postgres' e desconhecida. Reseta sem precisar
# dela, pelo metodo oficial -> deixa o pg_hba.conf em 'trust', troca a senha e
# restaura o pg_hba.conf. Requer Administrador (ja temos).
if (-not $ready -and $pgService) {
    Write-Warn "Senha do usuario 'postgres' desconhecida -- redefinindo automaticamente para '$PgSuperPassword'..."
    $svcInfo = Get-CimInstance Win32_Service -Filter "Name='$($pgService.Name)'" -ErrorAction SilentlyContinue
    $dataDir = $null
    if ($svcInfo -and $svcInfo.PathName -match '-D\s+"([^"]+)"') { $dataDir = $Matches[1] }
    $hba = if ($dataDir) { Join-Path $dataDir 'pg_hba.conf' } else { $null }

    if ($hba -and (Test-Path $hba)) {
        $backup = "$hba.contabilis.bak"
        Copy-Item $hba $backup -Force
        try {
            # Libera acesso local sem senha temporariamente.
            @(
                'host all all 127.0.0.1/32 trust',
                'host all all ::1/128 trust',
                'local all all trust'
            ) | Set-Content -Path $hba -Encoding ascii
            Restart-Service $pgService.Name -Force
            Start-Sleep -Seconds 3

            Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
            & $psql @psqlBase -c "ALTER USER postgres WITH PASSWORD '$PgSuperPassword';"
            if ($LASTEXITCODE -eq 0) { $ready = $true; Write-Ok "Senha do 'postgres' redefinida." }
        }
        finally {
            # Sempre restaura a configuracao original de autenticacao.
            Copy-Item $backup $hba -Force
            Remove-Item $backup -Force -ErrorAction SilentlyContinue
            Restart-Service $pgService.Name -Force
            Start-Sleep -Seconds 3
            $env:PGPASSWORD = $PgSuperPassword
        }
    }
}

if (-not $ready) {
    throw @"
Nao foi possivel conectar ao PostgreSQL em localhost:$DbPort como usuario 'postgres'
e a redefinicao automatica da senha tambem nao funcionou.
Saidas possiveis:
  1) Se voce SOUBER a senha do 'postgres', rode:
        .\setup-windows.ps1 -PgSuperPassword "SUA_SENHA"
  2) Para comecar limpo, desinstale o PostgreSQL atual e rode o setup de novo
     (o script reinstala com a senha 'postgres'):
        .\uninstall-windows.ps1 -RemovePostgres -KeepPackages -Force
     (apague tambem a pasta de dados, ex. C:\Program Files\PostgreSQL\<versao>\data)
"@
}

# Cria a role (idempotente).
$roleExists = ((& $psql @psqlBase -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DbUser'") -join '').Trim()
if ($roleExists -ne '1') {
    & $psql @psqlBase -c "CREATE ROLE $DbUser WITH LOGIN PASSWORD '$DbPassword' SUPERUSER;"
    Write-Ok "Role '$DbUser' criada."
} else { Write-Ok "Role '$DbUser' ja existe." }

# Cria o banco (idempotente).
$dbExists = ((& $psql @psqlBase -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'") -join '').Trim()
if ($dbExists -ne '1') {
    & $psql @psqlBase -c "CREATE DATABASE $DbName OWNER $DbUser;"
    Write-Ok "Banco '$DbName' criado."
} else { Write-Ok "Banco '$DbName' ja existe." }

Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

# ----------------------------------------------------------------------------
# 4. Clonar o repositorio
# ----------------------------------------------------------------------------
Write-Step 'Clonando o repositorio'
if (Test-Path (Join-Path $InstallDir '.git')) {
    Write-Info 'Repositorio ja clonado -- atualizando (git pull)...'
    git -C $InstallDir pull --ff-only
} else {
    if (Test-Path $InstallDir) {
        $isEmpty = -not (Get-ChildItem -Force $InstallDir | Select-Object -First 1)
        if (-not $isEmpty) { throw "$InstallDir ja existe e nao esta vazio." }
    }
    git clone $RepoUrl $InstallDir
}
Write-Ok "Codigo em $InstallDir"

$BackendDir  = Join-Path $InstallDir 'backend'
$FrontendDir = Join-Path $InstallDir 'frontend'

# ----------------------------------------------------------------------------
# 5. Arquivos .env
# ----------------------------------------------------------------------------
Write-Step 'Gerando arquivos .env'

$backendEnv = Join-Path $BackendDir '.env'
@"
PORT=$BackendPort
DATABASE_URL=postgres://${DbUser}:${DbPassword}@localhost:$DbPort/$DbName
JWT_SECRET=troque-este-segredo-em-producao
JWT_EXPIRES_IN=8h
CREDENTIALS_ENCRYPTION_KEY=Y29udGFiaWxpcy1kZXYta2V5LTMyLWJ5dGVzLWFhYWE=
CORS_ORIGIN=http://${AliasHost},http://localhost:5173
"@ | Set-Content -Path $backendEnv -Encoding ascii
Write-Ok "backend/.env"

# VITE_API_URL vazio = mesma origem (/api); o Vite faz proxy para a API local.
$frontendEnv = Join-Path $FrontendDir '.env'
@"
VITE_API_URL=
API_PROXY_TARGET=http://localhost:$BackendPort
"@ | Set-Content -Path $frontendEnv -Encoding ascii
Write-Ok "frontend/.env"

# ----------------------------------------------------------------------------
# 6. Dependencias, migrations e seed
# ----------------------------------------------------------------------------
Write-Step 'Instalando dependencias e preparando o banco'

# O projeto e um monorepo com workspaces npm: um unico "npm install" na raiz
# instala backend e frontend, com as dependencias em node_modules na raiz.
Push-Location $InstallDir
Write-Info 'npm install (backend + frontend)'
cmd /c 'npm install'        ; if ($LASTEXITCODE -ne 0) { throw 'npm install falhou.' }
Pop-Location
Write-Ok 'Dependencias instaladas.'

Push-Location $BackendDir
Write-Info 'backend: migrations'
cmd /c 'npm run db:migrate' ; if ($LASTEXITCODE -ne 0) { throw 'migrations falharam.' }
Write-Info 'backend: seed'
cmd /c 'npm run seed'       ; if ($LASTEXITCODE -ne 0) { throw 'seed falhou.' }
Pop-Location
Write-Ok 'Backend pronto.'

# ----------------------------------------------------------------------------
# 7. Alias no arquivo hosts
# ----------------------------------------------------------------------------
Write-Step "Registrando o alias http://$AliasHost"
$hostsFile = Join-Path $env:windir 'System32\drivers\etc\hosts'
$entry = "127.0.0.1`t$AliasHost"
$already = Select-String -Path $hostsFile -Pattern "\s$([regex]::Escape($AliasHost))(\s|$)" -ErrorAction SilentlyContinue
if (-not $already) {
    Add-Content -Path $hostsFile -Value "`r`n# Contabilis (alias local)`r`n$entry"
    Write-Ok "Alias adicionado ao hosts."
} else { Write-Ok "Alias ja registrado no hosts." }

# ----------------------------------------------------------------------------
# 8. Subir backend e frontend
# ----------------------------------------------------------------------------
Write-Step 'Subindo a aplicacao'

Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command',
    "Set-Location '$BackendDir'; Write-Host 'API Contabilis' -ForegroundColor Cyan; npm run dev"
)
Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command',
    "Set-Location '$FrontendDir'; `$env:FRONTEND_PORT=$FrontendPort; Write-Host 'App Contabilis' -ForegroundColor Cyan; npm run dev"
)

# Aguarda o frontend responder e abre o navegador.
$appUrl = if ($FrontendPort -eq 80) { "http://$AliasHost" } else { "http://${AliasHost}:$FrontendPort" }
Write-Info "Aguardando o app em $appUrl ..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 2 *> $null
        break
    } catch { Start-Sleep -Seconds 2 }
}
Start-Process $appUrl

Write-Host ''
Write-Host '================================================================' -ForegroundColor Green
Write-Host '  Pronto! Contabilis instalado e em execucao.' -ForegroundColor Green
Write-Host "  App  : $appUrl" -ForegroundColor Green
Write-Host "  API  : http://localhost:$BackendPort/api" -ForegroundColor Green
Write-Host '  Login: gisele / contabilis   (ou admin / contabilis)' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Green
Write-Host 'As janelas da API e do App ficam abertas. Feche-as para parar.' -ForegroundColor DarkGray

}
catch {
    Write-Host ''
    Write-Host '================================================================' -ForegroundColor Red
    Write-Host '  A INSTALACAO FALHOU' -ForegroundColor Red
    Write-Host '================================================================' -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.InvocationInfo) {
        Write-Host "Em   : linha $($_.InvocationInfo.ScriptLineNumber) -- $($_.InvocationInfo.Line.Trim())" -ForegroundColor DarkYellow
    }
    Write-Host ''
    Write-Host 'Copie a mensagem acima. O script e idempotente: corrija a causa e rode de novo.' -ForegroundColor Yellow
}
finally {
    Write-Host ''
    Read-Host 'Pressione Enter para fechar esta janela'
}
