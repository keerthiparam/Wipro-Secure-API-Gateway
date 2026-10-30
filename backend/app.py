
from flask import Flask, jsonify

app = Flask(__name__)

# Mock network device database
devices = [
    {
        "id": "R001",
        "name": "Core Router",
        "type": "Router",
        "ip": "192.168.1.1",
        "status": "Online",
        "cpu": 42,
        "memory": 65
    },
    {
        "id": "S001",
        "name": "Access Switch",
        "type": "Switch",
        "ip": "192.168.1.2",
        "status": "Online",
        "cpu": 28,
        "memory": 40
    },
    {
        "id": "F001",
        "name": "Main Firewall",
        "type": "Firewall",
        "ip": "192.168.1.3",
        "status": "Offline",
        "cpu": 0,
        "memory": 0
    },
    {
        "id": "R002",
        "name": "Branch Router",
        "type": "Router",
        "ip": "192.168.1.4",
        "status": "Online",
        "cpu": 71,
        "memory": 82
    }
]


@app.route("/")
def home():
    return jsonify({
        "message": "Wipro Secure API Gateway - NMS Backend",
        "status": "running"
    })


# Get all network devices
@app.route("/api/devices", methods=["GET"])
def get_devices():
    return jsonify({
        "count": len(devices),
        "devices": devices
    })


# Get individual device
@app.route("/api/devices/<device_id>", methods=["GET"])
def get_device(device_id):
    for device in devices:
        if device["id"] == device_id:
            return jsonify(device)

    return jsonify({"error": "Device not found"}), 404


# Get network metrics
@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    online = sum(1 for d in devices if d["status"] == "Online")
    offline = len(devices) - online

    return jsonify({
        "total_devices": len(devices),
        "online_devices": online,
        "offline_devices": offline,
        "average_cpu": round(
            sum(d["cpu"] for d in devices) / len(devices), 2
        ),
        "average_memory": round(
            sum(d["memory"] for d in devices) / len(devices), 2
        )
    })


# Get network alerts
@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    alerts = []

    for device in devices:
        if device["status"] == "Offline":
            alerts.append({
                "device_id": device["id"],
                "device_name": device["name"],
                "severity": "Critical",
                "message": "Device is offline"
            })

        elif device["cpu"] > 70:
            alerts.append({
                "device_id": device["id"],
                "device_name": device["name"],
                "severity": "Warning",
                "message": "High CPU utilization"
            })

    return jsonify({
        "count": len(alerts),
        "alerts": alerts
    })


@app.route("/api/health")
def health():
    return jsonify({
        "status": "healthy",
        "service": "NMS Backend"
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
