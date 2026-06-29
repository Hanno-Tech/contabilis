<#
.SYNOPSIS
    Instalação do zero do Contabilis em uma máquina Windows.

.DESCRIPTION
    Faz TUDO, sem precisar de Node, Docker ou qualquer pré-requisito instalado:

      1. Instala o Chocolatey (gerenciador de pacotes do Windows).
      2. Instala Git, Node.js LTS e PostgreSQL (nativo, sem Docker).
      3. Cria o usuário e o banco "contabilis" no PostgreSQL.
      4. Clona https://github.com/Hanno-Tech/contabilis.git.
      5. Gera os arquivos .env do backend e do frontend.
      6. Instala dependências, roda as migrations e o seed.
      7. Cria o alias http://contabilis.local no arquivo hosts.
      8. Sobe o backend (API) e o frontend (app) em janelas separadas.
      9. Abre o navegador em http://contabilis.local.

    O script é idempotente: pode ser executado várias vezes sem efeitos colaterais.
    Ele se auto-eleva para Administrador (necessário para instalar programas,
    editar o arquivo hosts e servir o app na porta 80).

.NOTES
    Uso:  clique com o botão direito > "Executar com o PowerShell"
          ou rode  setup-windows.bat  (que cuida da política de execução).
#>

[CmdletBinding()]
param(
    [string]$RepoUrl     = 'https://github.com/Hanno-Tech/contabilis.git',
    [string]$InstallDir  = (Join-Path $env:USERPROFILE 'contabilis'),
    [string]$AliasHost   = 'contabilis.local',
    [int]   $FrontendPort = 80,
    [int]   $BackendPort  = 3333,

    # Credenciais do banco da aplicação (devem casar com o DATABASE_URL do .env).
    [string]$DbName      = 'contabilis',
    [string]$DbUser      = 'contabilis',
    [string]$DbPassword  = 'contabilis',
    [int]   $DbPort      = 5432,

    # Senha do superusuário "postgres" definida na instalação do PostgreSQL.
    [string]$PgSuperPassword = 'postgres'
)

$ErrorActionPreference = 'Stop'

# ----------------------------------------------------------------------------
# Utilidades
# ----------------------------------------------------------------------------
function Write-Step([string]$Message) {
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}
function Write-Ok([string]$Message)   { Write-Host "    [ok] $Message" -ForegroundColor Green }
function Write-Info([string]$Message) { Write-Host "    $Message" -ForegroundColor DarkGray }

# Recarrega o PATH (Machine + User) na sessão atual, para que programas recém
# instalados pelo Chocolatey fiquem disponíveis sem reiniciar o terminal.
function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = ($machine, $user | Where-Object { $_ }) -join ';'
}

# ----------------------------------------------------------------------------
# 0. Auto-elevação para Administrador
# ----------------------------------------------------------------------------
$principal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Host 'Solicitando privilégios de Administrador...' -ForegroundColor Yellow
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

Write-Host '================================================================' -ForegroundColor White
Write-Host '  Contabilis — instalação do zero no Windows' -ForegroundColor White
Write-Host '================================================================' -ForegroundColor White
Write-Info "Repositório : $RepoUrl"
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
    Write-Ok 'Chocolatey já presente.'
}

# ----------------------------------------------------------------------------
# 2. Git, Node.js LTS e PostgreSQL
# ----------------------------------------------------------------------------
Write-Step 'Instalando Git, Node.js LTS e PostgreSQL'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y --no-progress
} else { Write-Ok 'Git já presente.' }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y --no-progress
} else { Write-Ok "Node.js já presente ($(node -v))." }

# PostgreSQL nativo (substitui o Docker). A senha do superusuário "postgres"
# é definida aqui para que possamos criar o banco da aplicação em seguida.
$pgInstalled = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue
if (-not $pgInstalled) {
    choco install postgresql -y --no-progress --params "/Password:$PgSuperPassword"
} else { Write-Ok 'PostgreSQL já presente.' }

Update-SessionPath
Write-Ok 'Pacotes instalados.'

# ----------------------------------------------------------------------------
# 3. Configurar o banco da aplicação
# ----------------------------------------------------------------------------
Write-Step 'Configurando o banco PostgreSQL'

# Garante o serviço rodando.
$pgService = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($pgService -and $pgService.Status -ne 'Running') {
    Start-Service $pgService.Name
    Write-Info "Serviço $($pgService.Name) iniciado."
}

# Localiza o psql.exe da maior versão instalada.
$psql = Get-Command psql -ErrorAction SilentlyContinue | Select-Object -First 1 -Expand Source
if (-not $psql) {
    $psql = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1 -Expand FullName
}
if (-not $psql) { throw 'psql.exe não encontrado — verifique a instalação do PostgreSQL.' }
Write-Info "psql: $psql"

$env:PGPASSWORD = $PgSuperPassword
$psqlBase = @('-v', 'ON_ERROR_STOP=1', '-h', 'localhost', '-p', "$DbPort", '-U', 'postgres', '-d', 'postgres')

# Aguarda o servidor aceitar conexões (recém-instalado pode demorar alguns segundos).
$ready = $false
for ($i = 0; $i -lt 30 -and -not $ready; $i++) {
    & $psql @psqlBase -tAc 'SELECT 1' *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true } else { Start-Sleep -Seconds 2 }
}
if (-not $ready) { throw "Não foi possível conectar ao PostgreSQL em localhost:$DbPort." }

# Cria a role (idempotente).
$roleExists = ((& $psql @psqlBase -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DbUser'") -join '').Trim()
if ($roleExists -ne '1') {
    & $psql @psqlBase -c "CREATE ROLE $DbUser WITH LOGIN PASSWORD '$DbPassword' SUPERUSER;"
    Write-Ok "Role '$DbUser' criada."
} else { Write-Ok "Role '$DbUser' já existe." }

# Cria o banco (idempotente).
$dbExists = ((& $psql @psqlBase -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'") -join '').Trim()
if ($dbExists -ne '1') {
    & $psql @psqlBase -c "CREATE DATABASE $DbName OWNER $DbUser;"
    Write-Ok "Banco '$DbName' criado."
} else { Write-Ok "Banco '$DbName' já existe." }

Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

# ----------------------------------------------------------------------------
# 4. Clonar o repositório
# ----------------------------------------------------------------------------
Write-Step 'Clonando o repositório'
if (Test-Path (Join-Path $InstallDir '.git')) {
    Write-Info 'Repositório já clonado — atualizando (git pull)...'
    git -C $InstallDir pull --ff-only
} else {
    if (Test-Path $InstallDir) {
        $isEmpty = -not (Get-ChildItem -Force $InstallDir | Select-Object -First 1)
        if (-not $isEmpty) { throw "$InstallDir já existe e não está vazio." }
    }
    git clone $RepoUrl $InstallDir
}
Write-Ok "Código em $InstallDir"

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

$frontendEnv = Join-Path $FrontendDir '.env'
@"
VITE_API_URL=http://localhost:$BackendPort/api
"@ | Set-Content -Path $frontendEnv -Encoding ascii
Write-Ok "frontend/.env"

# ----------------------------------------------------------------------------
# 6. Dependências, migrations e seed
# ----------------------------------------------------------------------------
Write-Step 'Instalando dependências e preparando o banco'

Push-Location $BackendDir
Write-Info 'backend: npm install'
cmd /c 'npm install'        ; if ($LASTEXITCODE -ne 0) { throw 'npm install (backend) falhou.' }
Write-Info 'backend: migrations'
cmd /c 'npm run migrate up' ; if ($LASTEXITCODE -ne 0) { throw 'migrations falharam.' }
Write-Info 'backend: seed'
cmd /c 'npm run seed'       ; if ($LASTEXITCODE -ne 0) { throw 'seed falhou.' }
Pop-Location
Write-Ok 'Backend pronto.'

Push-Location $FrontendDir
Write-Info 'frontend: npm install'
cmd /c 'npm install'        ; if ($LASTEXITCODE -ne 0) { throw 'npm install (frontend) falhou.' }
Pop-Location
Write-Ok 'Frontend pronto.'

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
} else { Write-Ok "Alias já registrado no hosts." }

# ----------------------------------------------------------------------------
# 8. Subir backend e frontend
# ----------------------------------------------------------------------------
Write-Step 'Subindo a aplicação'

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
Write-Host '  Pronto! Contabilis instalado e em execução.' -ForegroundColor Green
Write-Host "  App  : $appUrl" -ForegroundColor Green
Write-Host "  API  : http://localhost:$BackendPort/api" -ForegroundColor Green
Write-Host '  Login: gisele / contabilis   (ou admin / contabilis)' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Green
Write-Host 'As janelas da API e do App ficam abertas. Feche-as para parar.' -ForegroundColor DarkGray
Write-Host ''
Read-Host 'Pressione Enter para fechar esta janela de instalação'
