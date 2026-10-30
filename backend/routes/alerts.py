
from flask import Blueprint, jsonify
from data.devices import devices

# Blueprint for network alerts
alerts_bp = Blueprint("alerts", __name__)


# GET /api/alerts
@alerts_bp.route("/api/alerts", methods=["GET"])
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
