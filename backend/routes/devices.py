
from flask import Blueprint, jsonify
from data.devices import devices

# Create a Blueprint for device-related APIs
device_bp = Blueprint("devices", __name__)


# GET /api/devices
@device_bp.route("/api/devices", methods=["GET"])
def get_devices():
    return jsonify({
        "count": len(devices),
        "devices": devices
    })


# GET /api/devices/<device_id>
@device_bp.route("/api/devices/<device_id>", methods=["GET"])
def get_device(device_id):
    for device in devices:
        if device["id"] == device_id:
            return jsonify(device)

    return jsonify({
        "error": "Device not found"
    }), 404
