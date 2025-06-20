var firebaseConfig = {
  apiKey: "AIzaSyAgvJHhEzCFFl4UBgyoWhHeSRZO2e6tikM",
  authDomain: "q-game-3c224.firebaseapp.com",
  databaseURL: "https://q-game-3c224-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "q-game-3c224",
  storageBucket: "q-game-3c224.appspot.com",
  messagingSenderId: "685733322297",
  appId: "1:685733322297:web:4e2f5f159de26cca65b7e8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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

console.log("Game initialized for room:", room, "Player:", playerId, "Host:", isHost);

// Initialize room and questions
fetch(`/init-room?room=${room}`)
  .then(response => response.json())
  .then(data => {
    console.log("Room initialized:", data);
  })
  .catch(error => {
    console.error("Error initializing room:", error);
  });

// 👥 Track live players
database.ref(`/${room}/players/${playerId}`).set({
  name: playerId,
  timestamp: firebase.database.ServerValue.TIMESTAMP
});

database.ref(`/${room}/players/${playerId}`).onDisconnect().remove();

database.ref(`/${room}/players`).on("value", snap => {
  const players = snap.val() || {};
  const playerCount = Object.keys(players).length;
  playerCountBox.innerText = `Players online: ${playerCount}`;
  console.log("Players updated:", playerCount);
});

// 🧠 Load and watch question
function loadQuestion(num) {
  console.log("Loading question:", num);
  currentQ = num;
  answered = false;
  answerInput.value = "";
  answersList.innerHTML = "";
  waitingStatus.innerText = "";

  // Load question from global questions path
  database.ref(`/questions/q${num}`).once("value").then(snapshot => {
    const question = snapshot.val();
    if (question) {
      questionBox.innerText = question;
      console.log("Question loaded:", question);
    } else {
      questionBox.innerText = "🎉 Game Over!";
      console.log("Game over - no more questions");
    }
  }).catch(error => {
    console.error("Error loading question:", error);
    questionBox.innerText = "Error loading question";
  });

  // Watch for answers
  database.ref(`/${room}/answers/q${num}`).on("value", snap => {
    const answers = snap.val() || {};
    const answerEntries = Object.entries(answers);
    
    if (answerEntries.length > 0) {
      const html = answerEntries.map(([name, ans]) => `<li><b>${name}:</b> ${ans}</li>`).join("");
      answersList.innerHTML = `<ul>${html}</ul>`;
    } else {
      answersList.innerHTML = "";
    }

    // 🔁 Auto-advance if all answered (host only)
    database.ref(`/${room}/players`).once("value").then(playerSnap => {
      const players = playerSnap.val() || {};
      const total = Object.keys(players).length;
      const submitted = Object.keys(answers).length;
      
      console.log(`Answers: ${submitted}/${total}`);
      
      if (isHost && total > 0 && submitted === total && num < 20) {
        waitingStatus.innerText = "All answered! Moving to next question...";
        setTimeout(() => {
          database.ref(`/${room}/current`).set(num + 1);
        }, 3000);
      } else if (submitted < total && total > 0) {
        waitingStatus.innerText = `Waiting for ${total - submitted} more...`;
      } else if (submitted === total && total > 0) {
        waitingStatus.innerText = "All answered!";
      }
    });
  });
}

// 📤 Submit answer
submitBtn.addEventListener('click', () => {
  const answer = answerInput.value.trim();
  console.log("Submit clicked, answer:", answer, "answered:", answered);
  
  if (answered) {
    alert("You have already answered this question!");
    return;
  }
  
  if (!answer) {
    alert("Please enter an answer!");
    return;
  }
  
  database.ref(`/${room}/answers/q${currentQ}/${playerId}`).set(answer)
    .then(() => {
      console.log("Answer submitted successfully");
      answered = true;
      answerInput.value = "";
      submitBtn.textContent = "Submitted!";
      submitBtn.disabled = true;
    })
    .catch(error => {
      console.error("Error submitting answer:", error);
      alert("Error submitting answer. Please try again.");
    });
});

// Enable submit on Enter key
answerInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitBtn.click();
  }
});

// 👂 Listen for current question number
database.ref(`/${room}/current`).on("value", snapshot => {
  const q = snapshot.val() || 1;
  console.log("Current question changed to:", q);
  
  // Reset submit button when question changes
  submitBtn.textContent = "Submit";
  submitBtn.disabled = false;
  
  loadQuestion(q);
});

// 💬 Chat system
chatSend.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  console.log("Chat send clicked:", msg);
  
  if (!msg) {
    alert("Please enter a message!");
    return;
  }
  
  database.ref(`/${room}/chat`).push({
    name: playerId,
    message: msg,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    console.log("Chat message sent");
    chatInput.value = "";
  }).catch(error => {
    console.error("Error sending chat:", error);
  });
});

// Enable chat on Enter key
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    chatSend.click();
  }
});

database.ref(`/${room}/chat`).on("child_added", snap => {
  const data = snap.val();
  if (data && data.name && data.message) {
    const msgEl = document.createElement("div");
    msgEl.innerHTML = `<b>${data.name}:</b> ${data.message}`;
    msgEl.style.marginBottom = "5px";
    chatBox.appendChild(msgEl);
    chatBox.scrollTop = chatBox.scrollHeight;
    console.log("Chat message added:", data);
  }
});

// 🔘 Host manual next
nextBtn.addEventListener('click', () => {
  console.log("Next button clicked, isHost:", isHost);
  
  if (!isHost) {
    alert("Only the host can go to the next question!");
    return;
  }
  
  database.ref(`/${room}/current`).once("value").then(snap => {
    const current = snap.val() || 1;
    console.log("Current question:", current);
    
    if (current < 20) {
      database.ref(`/${room}/current`).set(current + 1)
        .then(() => {
          console.log("Advanced to question:", current + 1);
        })
        .catch(error => {
          console.error("Error advancing question:", error);
        });
    } else {
      questionBox.innerText = "🎉 Game Over!";
      alert("Game completed!");
    }
  });
});

// Show/hide next button based on host status
if (isHost) {
  nextBtn.style.display = "inline-block";
} else {
  nextBtn.style.display = "none";
}

console.log("Script loaded successfully");