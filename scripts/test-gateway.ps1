$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Tech\Github\Wipro-Secure-API-Gateway"
$BackendDir = Join-Path $ProjectRoot "backend"
$SecretsFile = Join-Path $ProjectRoot "scripts\.gateway-secrets"

if (-not (Test-Path $SecretsFile)) {
    throw "Secrets file not found. Run .\scripts\start.ps1 first."
}

$secrets = @{}
Get-Content $SecretsFile | ForEach-Object {
    if ($_ -match '^(JWT_SECRET_KEY|OAUTH_CLIENT_ID|OAUTH_CLIENT_SECRET)=(.*)$') {
        $secrets[$matches[1]] = $matches[2]
    }
}

Write-Host "`n[1/6] Public health endpoint"
$health = Invoke-RestMethod "http://127.0.0.1:8080/api/health"
if ($health.status -ne "healthy") { throw "Health check failed." }
Write-Host "PASS: health endpoint is public."

Write-Host "`n[2/6] Protected endpoint without token"
$unauthorizedStatus = $null
try {
    Invoke-WebRequest "http://127.0.0.1:8080/api/devices" -UseBasicParsing | Out-Null
} catch {
    $unauthorizedStatus = [int]$_.Exception.Response.StatusCode
}
if ($unauthorizedStatus -ne 401) {
    throw "Expected 401 without a token; received $unauthorizedStatus."
}
Write-Host "PASS: gateway rejects requests without JWT (401)."

Write-Host "`n[3/6] OAuth client-credentials token issuance"
$form = @{
    grant_type = "client_credentials"
    client_id = $secrets["OAUTH_CLIENT_ID"]
    client_secret = $secrets["OAUTH_CLIENT_SECRET"]
}
$token = Invoke-RestMethod -Uri "http://127.0.0.1:5000/oauth/token" -Method Post -Body $form
if (-not $token.access_token) { throw "OAuth did not return an access token." }
Write-Host "PASS: received Bearer token; expires in $($token.expires_in) seconds."

Write-Host "`n[4/6] Flask JWT validation endpoint"
$headers = @{ Authorization = "Bearer $($token.access_token)" }
$validation = Invoke-WebRequest -Uri "http://127.0.0.1:5000/internal/validate" `
    -Headers $headers -UseBasicParsing
if ([int]$validation.StatusCode -ne 204) { throw "JWT validation did not return 204." }
Write-Host "PASS: Flask validates the JWT (204)."

Write-Host "`n[5/6] Protected API through NGINX"
$devices = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/devices" -Headers $headers
Write-Host "PASS: authenticated request returned $($devices.count) devices."

Write-Host "`n[6/6] Invalid token rejection"
$badHeaders = @{ Authorization = "Bearer definitely-not-a-valid-token" }
$badStatus = $null
try {
    Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/devices" -Headers $badHeaders -UseBasicParsing | Out-Null
} catch {
    $badStatus = [int]$_.Exception.Response.StatusCode
}
if ($badStatus -ne 401) { throw "Expected 401 for invalid JWT; received $badStatus." }
Write-Host "PASS: invalid JWT rejected (401)."

Write-Host "`nALL GATEWAY TESTS PASSED." -ForegroundColor Green
