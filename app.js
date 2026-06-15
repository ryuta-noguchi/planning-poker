const CARDS = ['1', '2', '3', '5', '8', '13', '21', '34', '?'];

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const pokerRef = db.ref('poker');

let userId = localStorage.getItem('poker_uid');
if (!userId) {
  userId = Math.random().toString(36).slice(2, 11);
  localStorage.setItem('poker_uid', userId);
}
let userName = localStorage.getItem('poker_name') || '';
let appStarted = false;

const $ = id => document.getElementById(id);

// --- Name dialog ---

function showNameDialog() {
  $('nameInput').value = userName;
  $('nameDialog').classList.remove('hidden');
  setTimeout(() => $('nameInput').focus(), 50);
}

function hideNameDialog() {
  $('nameDialog').classList.add('hidden');
}

function submitName() {
  const name = $('nameInput').value.trim();
  if (!name) return;
  userName = name;
  localStorage.setItem('poker_name', userName);
  hideNameDialog();
  if (!appStarted) {
    startApp();
  } else {
    $('displayName').textContent = userName;
    db.ref(`poker/users/${userId}/name`).set(userName);
  }
}

$('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });
$('btnSaveName').addEventListener('click', submitName);
$('btnChangeName').addEventListener('click', showNameDialog);
$('btnReset').addEventListener('click', () => pokerRef.remove());

// --- App ---

function startApp() {
  appStarted = true;
  $('displayName').textContent = userName;
  $('app').classList.remove('hidden');

  const cardsEl = $('cards');
  CARDS.forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'card';
    btn.textContent = val;
    btn.dataset.value = val;
    btn.addEventListener('click', () => db.ref(`poker/users/${userId}/vote`).set(val));
    cardsEl.appendChild(btn);
  });

  pokerRef.on('value', snapshot => {
    const data = snapshot.val() || {};
    const users = data.users || {};
    const revealed = !!data.revealed;

    if (!users[userId]) {
      db.ref(`poker/users/${userId}`).set({ name: userName, vote: null });
    }

    renderUI(users, revealed);

    if (!revealed && Object.keys(users).length > 0) {
      if (Object.values(users).every(u => u.vote !== null)) {
        pokerRef.child('revealed').set(true);
      }
    }
  });
}

// --- Render ---

function renderUI(users, revealed) {
  const myVote = (users[userId] || {}).vote ?? null;

  // Participants
  const participantsEl = $('participants');
  participantsEl.innerHTML = '';
  const entries = Object.entries(users).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'ja'));

  if (entries.length === 0) {
    participantsEl.innerHTML = '<p class="empty">参加者がいません</p>';
  } else {
    entries.forEach(([, user]) => {
      const row = document.createElement('div');
      row.className = 'participant';

      const nameEl = document.createElement('span');
      nameEl.className = 'pname';
      nameEl.textContent = user.name;

      const badge = document.createElement('span');
      if (revealed) {
        badge.className = 'pvote';
        badge.textContent = user.vote ?? '—';
      } else {
        badge.className = 'pstatus ' + (user.vote !== null ? 'voted' : 'waiting');
        badge.textContent = user.vote !== null ? '投票済み' : '未投票';
      }

      row.appendChild(nameEl);
      row.appendChild(badge);
      participantsEl.appendChild(row);
    });
  }

  // Card section
  const cardSection = $('cardSection');
  if (revealed) {
    cardSection.classList.add('hidden');
  } else {
    cardSection.classList.remove('hidden');
    document.querySelectorAll('.card').forEach(card => {
      card.classList.toggle('selected', card.dataset.value === myVote);
    });
    const statusEl = $('myVoteStatus');
    statusEl.innerHTML = myVote !== null ? `選択中: <strong>${myVote}</strong>` : '未投票';
  }
}

// --- Init ---
if (userName) {
  startApp();
} else {
  showNameDialog();
}
