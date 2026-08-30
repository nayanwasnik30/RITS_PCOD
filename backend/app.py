"""Local server for the RIT PCOD Wellness Tracker."""

from pathlib import Path
import json

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

PROJECT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
DATA_FILE = BACKEND_DIR / "data.json"

app = Flask(__name__)
CORS(app)


@app.get("/")
def home():
    return send_from_directory(PROJECT_DIR, "index.html")


@app.get("/<path:filename>")
def app_files(filename):
    """Serve the tracker, JavaScript, and CSS from the project folder."""
    return send_from_directory(PROJECT_DIR, filename)


@app.post("/api/save")
def save_data():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Expected a JSON object."}), 400

    DATA_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return jsonify({"status": "saved"})


@app.get("/api/load")
def load_data():
    if not DATA_FILE.exists():
        return jsonify({})
    try:
        return jsonify(json.loads(DATA_FILE.read_text(encoding="utf-8")))
    except json.JSONDecodeError:
        return jsonify({"error": "Saved data is unreadable."}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
