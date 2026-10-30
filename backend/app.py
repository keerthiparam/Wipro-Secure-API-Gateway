
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({
        "message": "Wipro Secure API Gateway - NMS Backend",
        "status": "running"
    })

@app.route("/api/health")
def health():
    return jsonify({
        "status": "healthy",
        "service": "NMS Backend"
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
