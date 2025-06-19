var firebaseConfig = {
  apiKey: "AIzaSyAgvJHhEzCFFl4UBgyoWhHeSRZO2e6tikM",
  authDomain: "q-game-3c224.firebaseapp.com",
  databaseURL: "https://q-game-3c224-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "q-game-3c224",
  storageBucket: "q-game-3c224.appspot.com",
  messagingSenderId: "685733322297",
  appId: "1:685733322297:web:4e2f5f159de26cca65b7e8"
};
firebase.initializeApp(firebaseConfig);

const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room") || "default-room";

const playerId = prompt("Enter your name:") || `Player_${Math.floor(Math.random() * 1000)}`;
const isHost = confirm("Are you the host?");

const questionBox = document.getElementById("question-box");
const answerInput = document.getElementById("answer-input");
const submitBtn = document.getElementById("submit-btn");
const nextBtn = document.getElementById("next-btn");
const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const answersList = document.getElementById("answers-list");
const waitingStatus = document.getElementById("waiting-status");
const playerCountBox = document.getElementById("player-count");

let currentQ = 1;
let answered = false;

// 👥 Track live players
firebase.database().ref(`/${room}/players/${playerId}`).set(true);
firebase.database().ref(`/${room}/players/${playerId}`).onDisconnect().remove();

firebase.database().ref(`/${room}/players`).on("value", snap => {
  const players = snap.val() || {};
  playerCountBox.innerText = `Players online: ${Object.keys(players).length}`;
});

// 🧠 Load and watch question
function loadQuestion(num) {
  currentQ = num;
  answered = false;
  answerInput.value = "";
  answersList.innerHTML = "";
  waitingStatus.innerText = "";

  firebase.database().ref(`/questions/q${num}`).once("value").then(snapshot => {
    questionBox.innerText = snapshot.val() || "🎉 Game Over!";
  });

  firebase.database().ref(`/${room}/answers/q${num}`).on("value", snap => {
    const answers = snap.val() || {};
    const html = Object.entries(answers).map(([name, ans]) => `<li><b>${name}:</b> ${ans}</li>`).join("");
    answersList.innerHTML = `<ul>${html}</ul>`;

    // 🔁 Auto-advance if all answered (host only)
    firebase.database().ref(`/${room}/players`).once("value").then(playerSnap => {
      const total = Object.keys(playerSnap.val() || {}).length;
      const submitted = Object.keys(answers).length;
      if (isHost && total > 0 && submitted === total && num < 20) {
        setTimeout(() => {
          firebase.database().ref(`/${room}/current`).set(num + 1);
        }, 3000); // wait 3 sec before auto-advancing
      } else if (submitted < total) {
        waitingStatus.innerText = `Waiting for ${total - submitted} more...`;
      }
    });
  });
}

// 📤 Submit answer
submitBtn.onclick = () => {
  if (answered || !answerInput.value.trim()) return;
  firebase.database().ref(`/${room}/answers/q${currentQ}/${playerId}`).set(answerInput.value.trim());
  answered = true;
  answerInput.value = "";
};

// 👂 Listen for current question number
firebase.database().ref(`/${room}/current`).on("value", snapshot => {
  const q = snapshot.val() || 1;
  loadQuestion(q);
});

// 💬 Chat system
chatSend.onclick = () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  firebase.database().ref(`/${room}/chat`).push({ name: playerId, message: msg });
  chatInput.value = "";
};

firebase.database().ref(`/${room}/chat`).on("child_added", snap => {
  const { name, message } = snap.val();
  const msgEl = document.createElement("div");
  msgEl.innerHTML = `<b>${name}:</b> ${message}`;
  chatBox.appendChild(msgEl);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// 🔘 Host manual next (still allowed)
nextBtn.onclick = () => {
  if (!isHost) return alert("Only the host can go to the next question!");
  firebase.database().ref(`/${room}/current`).once("value").then(snap => {
    const current = snap.val() || 1;
    if (current < 20) firebase.database().ref(`/${room}/current`).set(current + 1);
    else questionBox.innerText = "🎉 Game Over!";
  });
};
