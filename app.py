from flask import Flask, request, jsonify, send_from_directory
import random, uuid, os, hmac, hashlib, json
from urllib.parse import unquote

app = Flask(__name__, static_folder="static")

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")

# ---------------- IN-MEMORY STORE ----------------
users = {}

# ---------------- GAME TIERS ----------------
TIERS = {
    200:  {"win_rate": 0.70, "reward": 300,   "label": "Rookie"},
    500:  {"win_rate": 0.55, "reward": 800,   "label": "Amateur"},
    1000: {"win_rate": 0.40, "reward": 2000,  "label": "Pro"},
    5000: {"win_rate": 0.25, "reward": 10000, "label": "Legendary"},
}

# ---------------- TELEGRAM INIT DATA VALIDATION ----------------
def verify_telegram_init_data(init_data: str) -> dict | None:
    """
    Validates Telegram WebApp initData using HMAC-SHA256.
    Returns the parsed user dict on success, None on failure.
    Skips validation if BOT_TOKEN is not set (dev mode).
    """
    if not BOT_TOKEN:
        # Dev mode: parse without verifying
        params = dict(p.split("=", 1) for p in unquote(init_data).split("&") if "=" in p)
        return json.loads(params.get("user", "{}"))

    params = dict(p.split("=", 1) for p in unquote(init_data).split("&") if "=" in p)
    received_hash = params.pop("hash", None)
    if not received_hash:
        return None

    # Build the check string: sorted key=value pairs joined by \n
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))

    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        return None

    return json.loads(params.get("user", "{}"))

# ---------------- SERVE FRONTEND ----------------
@app.route("/")
def index():
    return send_from_directory("static", "index.html")

# ---------------- CREATE / GET USER (Telegram-aware) ----------------
@app.route("/create_user", methods=["POST"])
def create_user():
    data = request.json or {}
    init_data = data.get("initData", "")

    tg_user = verify_telegram_init_data(init_data) if init_data else {}
    # Use Telegram user_id as key when available, else generate a UUID
    user_id = str(tg_user.get("id")) if tg_user.get("id") else str(uuid.uuid4())
    first_name = tg_user.get("first_name", "Player")
    username   = tg_user.get("username", "")

    if user_id not in users:
        users[user_id] = {
            "balance": 1000,
            "goals": 0, "shots": 0,
            "wins": 0, "losses": 0,
            "streak": 0, "best_streak": 0,
            "first_name": first_name,
            "username": username,
        }

    u = users[user_id]
    return jsonify({
        "user_id":    user_id,
        "balance":    u["balance"],
        "first_name": u["first_name"],
        "username":   u["username"],
    })

# ---------------- GET USER ----------------
@app.route("/user/<user_id>", methods=["GET"])
def get_user(user_id):
    if user_id not in users:
        return jsonify({"error": "User not found"}), 404
    u = users[user_id]
    return jsonify({k: u[k] for k in
        ("balance","goals","shots","wins","losses","streak","best_streak","first_name","username")})

# ---------------- PLAY ----------------
@app.route("/play", methods=["POST"])
def play():
    data      = request.json
    user_id   = data.get("user_id")
    stake     = data.get("stake")
    direction = data.get("direction", "center")

    if user_id not in users:
        return jsonify({"error": "User not found"}), 404

    stake = int(stake)
    if stake not in TIERS:
        return jsonify({"error": "Invalid stake"}), 400

    user = users[user_id]
    if user["balance"] < stake:
        return jsonify({"error": "Insufficient balance"}), 400

    user["balance"] -= stake
    user["shots"]   += 1

    tier       = TIERS[stake]
    zones      = ["left", "center", "right"]
    keeper_dir = random.choice(zones)
    win        = random.random() < tier["win_rate"]

    if win:
        reward = tier["reward"]
        user["balance"]     += reward
        user["wins"]        += 1
        user["goals"]       += 1
        user["streak"]      += 1
        user["best_streak"]  = max(user["streak"], user["best_streak"])
        return jsonify({
            "result": "win", "keeper_direction": keeper_dir,
            "reward": reward, "profit": reward - stake,
            "balance": user["balance"], "streak": user["streak"],
        })
    else:
        user["losses"] += 1
        user["streak"]  = 0
        return jsonify({
            "result": "lose", "keeper_direction": keeper_dir,
            "lost": stake, "balance": user["balance"], "streak": 0,
        })

# ---------------- LEADERBOARD ----------------
@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    top = sorted(users.items(), key=lambda x: x[1]["balance"], reverse=True)[:5]
    return jsonify([
        {"name": u.get("first_name","?"), "username": u.get("username",""),
         "balance": u["balance"], "wins": u["wins"]}
        for _, u in top
    ])

# ---------------- RUN ----------------
if __name__ == "__main__":
    os.makedirs("static", exist_ok=True)
    app.run(debug=True, port=5000)
