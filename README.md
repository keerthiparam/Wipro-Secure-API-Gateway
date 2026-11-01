# Wipro Secure API Gateway — Run Instructions

## Requirements

- Windows 10/11
- Python 3.10+
- Node.js and npm
- NGINX for Windows

The startup scripts expect the project at `C:\Tech\Github\Wipro-Secure-API-Gateway` and NGINX at `C:\Tech\nginx`.

## One-time setup

1. Clone the repository into `C:\Tech\Github\Wipro-Secure-API-Gateway`.
2. Open PowerShell and run:

```powershell
cd C:\Tech\Github\Wipro-Secure-API-Gateway

# Set up the Python backend
py -m venv backend\venv
backend\venv\Scripts\python.exe -m pip install Flask Flask-Cors PyJWT

# Install dashboard dependencies
cd dashboard
npm install
cd ..
```

3. Extract the NGINX for Windows package into `C:\Tech\nginx`.
4. Copy `gateway\nginx.conf` to `C:\Tech\nginx\conf\nginx.conf`, replacing the default configuration.

## Start the project

Open PowerShell in the project folder and run:

```powershell
cd C:\Tech\Github\Wipro-Secure-API-Gateway
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\start.ps1
```

The script starts the Flask backend, starts or reloads NGINX, creates local OAuth/JWT secrets if needed, checks the gateway, and starts the dashboard.

Open:

- Dashboard: http://localhost:3000
- API Gateway: http://localhost:8080
- Public health check: http://localhost:8080/api/health

## Run the tests

With the services running, execute:

```powershell
.\scripts\test-gateway.ps1
```

## Stop the project

```powershell
.\scripts\stop.ps1
```

The local secrets are stored in `scripts\.gateway-secrets`. Do not commit or share this file.
