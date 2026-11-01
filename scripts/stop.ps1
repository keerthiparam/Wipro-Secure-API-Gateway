$ErrorActionPreference = "Continue"

$ProjectRoot = "C:\Tech\Github\Wipro-Secure-API-Gateway"
$RuntimeDir = Join-Path $ProjectRoot "scripts\.runtime"
$NginxDir = "C:\Tech\nginx"
$NginxExe = Join-Path $NginxDir "nginx.exe"

function Stop-TreeFromPidFile($Name) {
    $pidFile = Join-Path $RuntimeDir "$Name.pid"
    if (Test-Path $pidFile) {
        $processId = (Get-Content $pidFile -Raw).Trim()
        if ($processId -match '^\d+$') {
            & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
}

# Ask NGINX to shut down gracefully.
if (Test-Path $NginxExe) {
    & $NginxExe -p "$NginxDir/" -c "conf/nginx.conf" -s quit 2>$null
}

Stop-TreeFromPidFile "dashboard"
Stop-TreeFromPidFile "flask"

Write-Host "Stop signal sent. If NGINX was not running, its quit command is harmless."
Write-Host "Check ports 3000, 5000 and 8080 if any process remains."
