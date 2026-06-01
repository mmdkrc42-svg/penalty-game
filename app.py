from flask import Flask, request, jsonify, send_from_directory
import random, uuid, os

app = Flask(__name__, static_folder="static")

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "")

users = {}

TIERS = {
    200:  {"win_rate": 0.70, "reward": 300},
    500:  {"win_rate": 0.55, "reward": 800},
    1000: {"win_rate": 0.40, "reward": 2000},
    5000: {"win_rate": 0.25, "reward": 10000},
}

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/create_user", methods=["POST"])
def create_user():
    user_id = str(uuid.uuid4())
    users[user_id] = {"balance": 1000, "goals": 0, "shots": 0, "wins": 0, "losses": 0, "streak": 0, "best_streak": 0, "first_name": "Player", "username": ""}
    return jsonify({"user_id": user_id, "balance": 1000, "first_name": "Player"})

@app.route("/play", methods=["POST"])
def play():
    data = request.json
    user_id = data.get("user_id")
    stake = int(data.get("stake"))
    direction = data.get("direction", "center")
    if user_id not in users:
        return jsonify({"error": "User not found"}), 404
    if stake not in TIERS:
        return jsonify({"error": "Invalid stake"}), 400
    user = users[user_id]
    if user["balance"] < stake:
        return jsonify({"error": "Insufficient balance"}), 400
    user["balance"] -= stake
    user["shots"] += 1
    tier = TIERS[stake]
    keeper_dir = random.choice(["left", "center", "right"])
    win = random.random() < tier["win_rate"]
    if win:
        reward = tier["reward"]
        user["balance"] += reward
        user["wins"] += 1
        user["goals"] += 1
        user["streak"] += 1
        user["best_streak"] = max(user["streak"], user["best_streak"])
        return jsonify({"result": "win", "keeper_direction": keeper_dir, "reward": reward, "profit": reward - stake, "balance": user["balance"], "streak": user["streak"]})
    else:
        user["losses"] += 1
        user["streak"] = 0
        return jsonify({"result": "lose", "keeper_direction": keeper_dir, "lost": stake, "balance": user["balance"], "streak": 0})

@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    top = sorted(users.items(), key=lambda x: x[1]["balance"], reverse=True)[:5]
    return jsonify([{"name": u.get("first_name","?"), "balance": u["balance"], "wins": u["wins"]} for _, u in top])

@app.route("/setup_bot")
def setup_bot():
    import requests
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/setChatMenuButton"
    data = {"menu_button": '{"type":"web_app","text":"⚽ Play","web_app":{"url":"' + WEBAPP_URL + '"}}'}
    r = requests.post(url, data=data)
    return jsonify(r.json())

if __name__ == "__main__":
    os.makedirs("static", exist_ok=True)
    app.run(debug=True, port=5000)
