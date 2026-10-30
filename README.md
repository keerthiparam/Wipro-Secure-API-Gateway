
# Wipro Secure API Gateway for NMS Northbound Interfaces

A secure and scalable API Gateway for Network Management System (NMS) Northbound Interfaces (NBIs), designed to provide controlled access to network management APIs through centralized authentication, rate limiting and monitoring.

## Overview

Network Management Systems expose Northbound Interfaces (NBIs) that allow external applications to access network device information, metrics and alerts. However, exposing these interfaces directly increases the attack surface and introduces security risks.

This project implements an API Gateway using **NGINX** to act as a centralized entry point between external applications and NMS backend services.

The gateway is designed to provide:

- Centralized API access through NGINX.
- OAuth2-based authentication and JWT validation.
- Rate limiting to prevent excessive API requests.
- Network device information through mock NMS APIs.
- API request logging and monitoring.
- A dashboard for visualizing network and API activity.

## Architecture

```text
             External Applications
                      |
                      v
               NGINX API Gateway
                   Port 8080
                      |
             +--------+--------+
             |                 |
       Authentication     Rate Limiting
          (JWT)              (NGINX)
             |                 |
             +--------+--------+
                      |
                      v
                Flask Backend
                   Port 5000
                      |
              Mock NMS APIs
                      |
          +-----------+-----------+
          |           |           |
        Devices     Metrics     Alerts
                      |
                      v
              Monitoring Dashboard
                   (React)
```

*Note: Authentication, rate limiting and dashboard integration are planned integration components.*

## Technology Stack

| Component | Technology |
|---|---|
| Operating System | Ubuntu (target deployment), Windows (development) |
| API Gateway | NGINX |
| Backend | Python, Flask |
| Authentication | OAuth2, JWT |
| Rate Limiting | NGINX |
| Frontend | React, JavaScript |
| Database | SQLite (planned) |
| Version Control | Git, GitHub |

## Project Structure

```text
Wipro-Secure-API-Gateway/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   │
│   ├── data/
│   │   ├── __init__.py
│   │   └── devices.py
│   │
│   └── routes/
│       ├── __init__.py
│       ├── devices.py
│       ├── metrics.py
│       └── alerts.py
│
├── gateway/
│   └── nginx.conf
│
├── auth/                 # Authentication module
│
├── dashboard/            # React monitoring dashboard
│
├── docs/
│
├── .gitignore
└── README.md
```

## Backend API Endpoints

The Flask backend currently exposes the following REST APIs:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Backend information |
| GET | `/api/health` | Backend health check |
| GET | `/api/devices` | Retrieve all network devices |
| GET | `/api/devices/<device_id>` | Retrieve individual device details |
| GET | `/api/metrics` | Retrieve network statistics |
| GET | `/api/alerts` | Retrieve network alerts |

### Sample Device Response

`GET /api/devices`

```json
{
  "count": 4,
  "devices": [
    {
      "id": "R001",
      "name": "Core Router",
      "type": "Router",
      "ip": "192.168.1.1",
      "status": "Online",
      "cpu": 42,
      "memory": 65
    }
  ]
}
```

### Network Metrics

`GET /api/metrics`

Returns:

- Total number of devices.
- Number of online devices.
- Number of offline devices.
- Average CPU utilization.
- Average memory utilization.

### Network Alerts

`GET /api/alerts`

Generates alerts based on device conditions:

- Critical: Device is offline.
- Warning: CPU utilization exceeds 70%.

## Installation and Setup

### Prerequisites

- Python 3.10 or later.
- Git.
- NGINX.
- Visual Studio Code (recommended).

### 1. Clone the Repository

```bash
git clone https://github.com/keerthiparam/Wipro-Secure-API-Gateway.git

cd Wipro-Secure-API-Gateway
```

### 2. Set Up the Python Environment

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Activate it on Ubuntu:

```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
python -m pip install -r requirements.txt
```

### 4. Start the Flask Backend

```bash
python app.py
```

The backend runs at:

`http://127.0.0.1:5000`

### 5. Configure NGINX

Configure NGINX using the configuration file in:

`gateway/nginx.conf`

The current development configuration listens on port 8080 and forwards requests to the Flask backend on port 5000.

Start NGINX on Windows:

```powershell
cd C:\nginx
.\nginx.exe
```

Test the configuration:

```powershell
.\nginx.exe -t
```

Reload after configuration changes:

```powershell
.\nginx.exe -s reload
```

The API Gateway is accessible at:

`http://localhost:8080`

## Testing

Test the following endpoints through the NGINX gateway:

| Endpoint | Expected Result |
|---|---|
| `/api/health` | HTTP 200 |
| `/api/devices` | HTTP 200 |
| `/api/devices/R001` | HTTP 200 |
| `/api/metrics` | HTTP 200 |
| `/api/alerts` | HTTP 200 |
| `/api/devices/INVALID` | HTTP 404 |

Example:

```bash
curl http://localhost:8080/api/devices
```

## API Request Logging

NGINX access logging is configured to capture API request information.

The custom log format records:

- Request timestamp.
- Client IP address.
- HTTP request method.
- Requested URI.
- HTTP response status.
- Response size.
- Request processing time.
- Upstream backend status.

Log location:

`C:\nginx\logs\nms_access.log`

These logs will serve as the basis for API monitoring and dashboard statistics.

## Team Responsibilities

| Member | Responsibility | Technologies |
|---|---|---|
| Person 1 | Backend, API Gateway and integration | Python, Flask, NGINX |
| Person 2 | Authentication and rate limiting | OAuth2, JWT, NGINX |
| Person 3 | Dashboard and API monitoring | React, JavaScript |

## Development Workflow

The project uses Git feature branches for parallel development.

| Branch | Owner | Purpose |
|---|---|---|
| `main` | Person 1 | Stable integration |
| `person2-auth` | Person 2 | Authentication and security |
| `person3-dashboard` | Person 3 | Frontend and monitoring |

Completed features will be submitted through Pull Requests and merged into `main`.

## Current Implementation Status

### Completed

- [x] Flask backend setup.
- [x] Mock network device database.
- [x] Device information APIs.
- [x] Network metrics API.
- [x] Network alerts API.
- [x] Flask Blueprint-based modular architecture.
- [x] NGINX reverse proxy configuration.
- [x] NGINX access logging.
- [x] Backend and gateway integration.

### In Progress / Planned

- [ ] OAuth2 client credentials authentication.
- [ ] JWT generation and validation.
- [ ] NGINX rate limiting.
- [ ] Authentication failure monitoring.
- [ ] Rate-limit violation tracking.
- [ ] React monitoring dashboard.
- [ ] Aggregated API statistics endpoint.
- [ ] SQLite integration.
- [ ] Ubuntu deployment and end-to-end testing.

## Future Enhancements

- Integration with actual NMS Northbound Interfaces.
- Role-based access control.
- Improved API monitoring and analytics.
- Configurable rate-limiting policies.
- Centralized security audit logs.
- Scalable deployment for multiple NMS services.

## Disclaimer

This project currently uses mock network device data for development and demonstration purposes. It does not yet connect to a live Network Management System.

---

**Developed as part of the Wipro Secure API Gateway project.**
