
from flask import Blueprint, jsonify
from data.devices import devices

# Blueprint for network metrics
metrics_bp = Blueprint("metrics", __name__)


# GET /api/metrics
@metrics_bp.route("/api/metrics", methods=["GET"])
def get_metrics():
    online = sum(
        1 for device in devices
        if device["status"] == "Online"
    )

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
