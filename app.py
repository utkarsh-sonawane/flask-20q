from flask import Flask, render_template, request, Response, jsonify
import firebase_admin
from firebase_admin import credentials, db
import os
import json
import random
from dotenv import load_dotenv

# ✅ Load environment variables from .env
load_dotenv()

app = Flask(__name__)

# ✅ Firebase setup using env variables
cred_path = os.getenv("FIREBASE_CRED_PATH")  # points to firebase-admin-key.json
db_url = os.getenv("FIREBASE_DB_URL")

if not cred_path or not db_url:
    raise Exception("Missing FIREBASE_CRED_PATH or FIREBASE_DB_URL in .env")

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred, {
    "databaseURL": db_url
})

# ✅ Load local questions
with open("questions.json", "r", encoding="utf-8") as f:
    all_questions = json.load(f)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate-questions", methods=["GET", "POST"])
def generate_questions():
    questions = random.sample(all_questions, 20)

    # ✅ Get room name from query string — default to "room1"
    room = request.args.get("room", "room1")

    for i, q in enumerate(questions):
        db.reference(f"/{room}/questions/q{i+1}").set(q)

    # ✅ Reset to question 1
    db.reference(f"/{room}/current").set(1)

    return jsonify({"status": "success", "questions": questions})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000, debug=True)
