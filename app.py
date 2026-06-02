from flask import Flask, request, jsonify, send_from_directory
import random, hashlib, hmac, json, os, uuid
from urllib.parse import unquote

app = Flask(__name__, static_folder="static")

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "")

# In-memory store keyed by str(telegram_user_id) or a guest UUID
users = {}

TIERS = {
    200:  {"win_rate": 0.70, "reward": 300},
    500:  {"win_rate": 0.55, "reward": 800},
    1000: {"win_rate": 0.40, "reward": 2000},
    5000: {"win_rate": 0.25, "reward": 10000},
}

START_BALANCE    = 1000
REFILL_THRESHOLD = 100
REFILL_AMOUNT    = 1000


def verify_init_data(init_data: str):
    """Validate Telegram WebApp HMAC and return parsed user dict, or None."""
    if not BOT_TOKEN or not init_data:
        return None
    params = {}
    for chunk in init_data.split("&"):
        if "=" in chunk:
            k, v = chunk.split("=", 1)
            params[unquote(k)] = unquote(v)
    check_hash = params.pop("hash", None)
    if not check_hash:
        return None
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(check_hash, expected):
        return None
    user_json = params.get("user")
    if user_json:
        try:
            return json.loads(user_json)
        except Exception:
            return {}
    return {}


def make_user(first_name="Player", username=""):
    return {
        "balance":    START_BALANCE,
        "goals":      0,
        "shots":      0,
        "wins":       0,
        "losses":     0,
        "streak":     0,
        "best_streak": 0,
        "first_name": first_name,
        "username":   username,
    }


def serialize(uid, u):
    return {
        "user_id":    uid,
        "balance":    u["balance"],
        "first_name": u["first_name"],
        "username":   u["username"],
        "goals":      u["goals"],
        "shots":      u["shots"],
        "wins":       u["wins"],
        "losses":     u["losses"],
        "streak":     u["streak"],
        "best_streak": u["best_streak"],
    }


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/create_user", methods=["POST"])
def create_user():
    body      = request.get_json(silent=True) or {}
    init_data = body.get("initData", "")

    tg_user = verify_init_data(init_data)

    if tg_user and tg_user.get("id"):
        uid        = str(tg_user["id"])
        first_name = tg_user.get("first_name", "Player")
        username   = tg_user.get("username", "")
        if uid not in users:
            users[uid] = make_user(first_name, username)
        else:
            users[uid]["first_name"] = first_name
            users[uid]["username"]   = username
    else:
        uid = str(uuid.uuid4())
        users[uid] = make_user()

    u = users[uid]

    refilled = False
    if u["balance"] < REFILL_THRESHOLD:
        u["balance"] = REFILL_AMOUNT
        refilled = True

    resp = serialize(uid, u)
    resp["refilled"] = refilled
    return jsonify(resp)


@app.route("/user/<uid>", methods=["GET"])
def get_user(uid):
    if uid not in users:
        return jsonify({"error": "Not found"}), 404
    return jsonify(serialize(uid, users[uid]))


@app.route("/play", methods=["POST"])
def play():
    data      = request.get_json(silent=True) or {}
    user_id   = data.get("user_id")
    direction = data.get("direction", "center")

    try:
        stake = int(data.get("stake", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid stake"}), 400

    if user_id not in users:
        return jsonify({"error": "User not found"}), 404
    if stake not in TIERS:
        return jsonify({"error": "Invalid stake amount"}), 400

    u = users[user_id]
    if u["balance"] < stake:
        return jsonify({"error": "Insufficient balance"}), 400

    tier       = TIERS[stake]
    keeper_dir = random.choice(["left", "center", "right"])
    win        = random.random() < tier["win_rate"]

    u["balance"] -= stake
    u["shots"]   += 1

    if win:
        reward           = tier["reward"]
        u["balance"]    += reward
        u["wins"]       += 1
        u["goals"]      += 1
        u["streak"]     += 1
        u["best_streak"] = max(u["streak"], u["best_streak"])
        return jsonify({
            "result":           "win",
            "keeper_direction": keeper_dir,
            "reward":           reward,
            "profit":           reward - stake,
            "balance":          u["balance"],
            "streak":           u["streak"],
            "best_streak":      u["best_streak"],
        })
    else:
        u["losses"] += 1
        u["streak"]  = 0
        return jsonify({
            "result":           "lose",
            "keeper_direction": keeper_dir,
            "lost":             stake,
            "balance":          u["balance"],
            "streak":           0,
            "best_streak":      u["best_streak"],
        })


@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    top = sorted(users.items(), key=lambda x: x[1]["balance"], reverse=True)[:10]
    return jsonify([
        {
            "name":     u.get("first_name", "?"),
            "username": u.get("username", ""),
            "balance":  u["balance"],
            "wins":     u["wins"],
            "shots":    u["shots"],
        }
        for _, u in top
    ])


@app.route("/setup_bot")
def setup_bot():
    import requests as req
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/setChatMenuButton"
    body = {
        "menu_button": json.dumps({
            "type": "web_app",
            "text": "⚽ Play",
            "web_app": {"url": WEBAPP_URL},
        })
    }
    r = req.post(url, data=body)
    return jsonify(r.json())


if __name__ == "__main__":
    os.makedirs("static", exist_ok=True)
    app.run(debug=True, port=5000)
