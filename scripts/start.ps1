[CmdletBinding()]
param(
    [switch]$SkipDashboard
)

$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Tech\Github\Wipro-Secure-API-Gateway"
$BackendDir  = Join-Path $ProjectRoot "backend"
$DashboardDir = Join-Path $ProjectRoot "dashboard"
$ScriptsDir = Join-Path $ProjectRoot "scripts"
$RuntimeDir = Join-Path $ScriptsDir ".runtime"
$SecretsFile = Join-Path $ScriptsDir ".gateway-secrets"
$NginxDir = "C:\Tech\nginx"
$NginxExe = Join-Path $NginxDir "nginx.exe"

function Test-TcpPort([int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $connected = $result.AsyncWaitHandle.WaitOne(500)
        if ($connected) { $client.EndConnect($result) }
        return ($connected -and $client.Connected)
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

if (-not (Test-Path (Join-Path $BackendDir "app.py"))) {
    throw "Backend not found: $BackendDir"
}
if (-not (Test-Path (Join-Path $BackendDir "venv\Scripts\python.exe"))) {
    throw "Backend venv not found. Create/install it first."
}
if (-not (Test-Path $NginxExe)) {
    throw "NGINX not found: $NginxExe"
}

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

# Load persistent local secrets, or create them once.
$secretValues = @{}
if (Test-Path $SecretsFile) {
    Get-Content $SecretsFile | ForEach-Object {
        if ($_ -match '^(JWT_SECRET_KEY|OAUTH_CLIENT_ID|OAUTH_CLIENT_SECRET)=(.*)$') {
            $secretValues[$matches[1]] = $matches[2]
        }
    }
}

$python = Join-Path $BackendDir "venv\Scripts\python.exe"
if (-not $secretValues["JWT_SECRET_KEY"]) {
    $secretValues["JWT_SECRET_KEY"] = (& $python -c "import secrets; print(secrets.token_urlsafe(48))").Trim()
}
if (-not $secretValues["OAUTH_CLIENT_ID"]) {
    $secretValues["OAUTH_CLIENT_ID"] = "nms-dashboard"
}
if (-not $secretValues["OAUTH_CLIENT_SECRET"]) {
    $secretValues["OAUTH_CLIENT_SECRET"] = (& $python -c "import secrets; print(secrets.token_urlsafe(32))").Trim()
}

@(
    "JWT_SECRET_KEY=$($secretValues['JWT_SECRET_KEY'])"
    "OAUTH_CLIENT_ID=$($secretValues['OAUTH_CLIENT_ID'])"
    "OAUTH_CLIENT_SECRET=$($secretValues['OAUTH_CLIENT_SECRET'])"
) | Set-Content -Path $SecretsFile -Encoding ASCII

# Restrict the secrets file to the current Windows user where possible.
try {
    $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    & icacls.exe $SecretsFile /inheritance:r /grant:r "$($user):(R,W)" | Out-Null
} catch {
    Write-Warning "Could not restrict secrets-file permissions. Protect this file manually."
}

$env:JWT_SECRET_KEY = $secretValues["JWT_SECRET_KEY"]
$env:OAUTH_CLIENT_ID = $secretValues["OAUTH_CLIENT_ID"]
$env:OAUTH_CLIENT_SECRET = $secretValues["OAUTH_CLIENT_SECRET"]
$env:NGINX_ACCESS_LOG = Join-Path $NginxDir "logs\nms_access.log"

# Start Flask if it is not already listening.
if (-not (Test-TcpPort 5000)) {
    Write-Host "Starting Flask backend..."
    $flaskOut = Join-Path $RuntimeDir "flask.out.log"
    $flaskErr = Join-Path $RuntimeDir "flask.err.log"
    $p = Start-Process -FilePath $python -ArgumentList "app.py" `
        -WorkingDirectory $BackendDir -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput $flaskOut -RedirectStandardError $flaskErr
    Set-Content (Join-Path $RuntimeDir "flask.pid") $p.Id

    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-TcpPort 5000) { $ready = $true; break }
        if ($p.HasExited) {
            Get-Content $flaskErr -ErrorAction SilentlyContinue
            throw "Flask exited during startup. Check $flaskErr"
        }
    }
    if (-not $ready) { throw "Flask did not start on port 5000. Check $flaskErr" }
} else {
    Write-Host "Flask is already listening on port 5000; leaving it running."
}

# Validate NGINX configuration before starting/reloading it.
Write-Host "Checking NGINX configuration..."
& $NginxExe -t -p "$NginxDir/" -c "conf/nginx.conf"
if ($LASTEXITCODE -ne 0) { throw "NGINX configuration test failed. NGINX was not reloaded." }

if (Test-TcpPort 8080) {
    Write-Host "Reloading NGINX..."
    & $NginxExe -p "$NginxDir/" -c "conf/nginx.conf" -s reload
    if ($LASTEXITCODE -ne 0) { throw "NGINX reload failed." }
} else {
    Write-Host "Starting NGINX..."
    Start-Process -FilePath $NginxExe -ArgumentList @("-p", "$NginxDir/", "-c", "conf/nginx.conf") `
        -WorkingDirectory $NginxDir -WindowStyle Hidden
    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        if (Test-TcpPort 8080) { $ready = $true; break }
    }
    if (-not $ready) { throw "NGINX did not start on port 8080. Check $NginxDir\logs\error.log" }
}

# Obtain a token and verify the gateway's protected route.
Write-Host "Checking OAuth token issuance..."
$form = @{
    grant_type = "client_credentials"
    client_id = $env:OAUTH_CLIENT_ID
    client_secret = $env:OAUTH_CLIENT_SECRET
}
$tokenResponse = Invoke-RestMethod -Uri "http://127.0.0.1:5000/oauth/token" -Method Post -Body $form
$authHeaders = @{ Authorization = "Bearer $($tokenResponse.access_token)" }

Write-Host "Checking public health endpoint..."
$health = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/health"
if ($health.status -ne "healthy") { throw "Health check returned an unexpected response." }

Write-Host "Checking protected devices endpoint..."
$devices = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/devices" -Headers $authHeaders
if ($devices.count -lt 1) { throw "Protected devices endpoint returned no devices." }

Write-Host ""
Write-Host "Gateway started successfully." -ForegroundColor Green
Write-Host "Dashboard:  http://localhost:3000"
Write-Host "Gateway:    http://localhost:8080"
Write-Host "Health:     http://localhost:8080/api/health"
Write-Host "Devices:    http://localhost:8080/api/devices (JWT required)"
Write-Host "OAuth:      http://localhost:5000/oauth/token"
Write-Host "Token expires in: $($tokenResponse.expires_in) seconds"

if (-not $SkipDashboard) {
    if (-not (Test-Path (Join-Path $DashboardDir "package.json"))) {
        Write-Warning "Dashboard package.json not found; skipping dashboard."
    } elseif (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        Write-Warning "npm.cmd not found; install Node.js or run with -SkipDashboard."
    } elseif (-not (Test-TcpPort 3000)) {
        Write-Host "Starting React dashboard..."
        $dashOut = Join-Path $RuntimeDir "dashboard.out.log"
        $dashErr = Join-Path $RuntimeDir "dashboard.err.log"
        $cmd = "npm.cmd run dev -- --host 127.0.0.1"
        $p = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $cmd) `
            -WorkingDirectory $DashboardDir -PassThru -WindowStyle Hidden `
            -RedirectStandardOutput $dashOut -RedirectStandardError $dashErr
        Set-Content (Join-Path $RuntimeDir "dashboard.pid") $p.Id
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 1
            if (Test-TcpPort 3000) { break }
        }
        if (-not (Test-TcpPort 3000)) {
            Write-Warning "Dashboard did not become ready. Check $dashErr and $dashOut."
        }
    } else {
        Write-Host "Dashboard is already listening on port 3000."
    }
}

Write-Host ""
Write-Host "Tip: run .\scripts\test-gateway.ps1 for a fuller security/API test."
