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

# ✅ Force UTF-8 encoding for Flask
app.config['JSON_AS_ASCII'] = False
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# ✅ Firebase setup using env variables
cred_path = os.getenv("FIREBASE_CRED_PATH")  # points to firebase-admin-key.json
db_url = os.getenv("FIREBASE_DB_URL")

if not cred_path or not db_url:
    raise Exception("Missing FIREBASE_CRED_PATH or FIREBASE_DB_URL in .env")

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred, {
    "databaseURL": db_url
})

# ✅ Load local questions with explicit UTF-8 encoding
with open("questions.json", "r", encoding="utf-8") as f:
    all_questions = json.load(f)

@app.route("/")
def index():
    response = render_template("index.html")
    # Force UTF-8 response
    return Response(response, mimetype='text/html; charset=utf-8')

@app.route("/generate-questions", methods=["GET", "POST"])
def generate_questions():
    questions = random.sample(all_questions, 20)

    # ✅ Get room name from query string — default to "room1"
    room = request.args.get("room", "room1")

    # ✅ Store questions in the global questions path AND room-specific path
    for i, q in enumerate(questions):
        db.reference(f"/questions/q{i+1}").set(q)  # Global questions
        db.reference(f"/{room}/questions/q{i+1}").set(q)  # Room-specific backup

    # ✅ Reset to question 1
    db.reference(f"/{room}/current").set(1)
    
    # ✅ Clear previous answers
    db.reference(f"/{room}/answers").delete()

    return jsonify({"status": "success", "questions": questions, "room": room})

@app.route("/init-room")
def init_room():
    """Initialize a room with questions automatically"""
    room = request.args.get("room", "default-room")
    
    # Check if questions already exist
    questions_ref = db.reference("/questions")
    existing_questions = questions_ref.get()
    
    if not existing_questions:
        # Generate questions if they don't exist
        questions = random.sample(all_questions, 20)
        for i, q in enumerate(questions):
            db.reference(f"/questions/q{i+1}").set(q)
    
    # Initialize room
    db.reference(f"/{room}/current").set(1)
    
    return jsonify({"status": "initialized", "room": room})

if __name__ == "__main__":
    # ✅ Ensure UTF-8 encoding for Flask responses
    app.run(host="0.0.0.0", port=3000, debug=True)