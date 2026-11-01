import os

from flask import Flask, jsonify

from routes.devices import device_bp
from routes.metrics import metrics_bp
from routes.alerts import alerts_bp
from routes.monitoring import monitoring_bp

app = Flask(__name__)

app.config["NGINX_ACCESS_LOG"] = os.getenv(
    "NGINX_ACCESS_LOG",
    os.path.join("logs", "nms_access.log")
)

# Register API blueprints
app.register_blueprint(device_bp)
app.register_blueprint(metrics_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(monitoring_bp)


@app.route("/")
def home():
    return jsonify({
        "message": "Wipro Secure API Gateway - NMS Backend",
        "status": "running"
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "NMS Backend"
    })


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
