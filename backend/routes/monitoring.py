
from flask import Blueprint, jsonify, current_app
from services.nginx_logs import get_nginx_stats

monitoring_bp = Blueprint("monitoring", __name__)


@monitoring_bp.route("/api/monitoring", methods=["GET"])
def get_monitoring_stats():
    log_path = current_app.config["NGINX_ACCESS_LOG"]

    stats = get_nginx_stats(log_path)

    if "error" in stats:
        return jsonify(stats), 500

    return jsonify(stats)
