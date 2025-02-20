// Session Storage Keys
const PERSONAL_NOTES_KEY = 'personalNotes';
const PUBLIC_POSTS_KEY = 'publicPosts';

// DOM Elements
const personalMode = document.getElementById('personal-mode');
const publicMode = document.getElementById('public-mode');
const chatContainer = document.getElementById('chat-container');
const postContainer = document.getElementById('post-container');
const personalInput = document.getElementById('personal-input');
const publicInput = document.getElementById('public-input');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const modeToggle = document.getElementById('mode-toggle');

// Load Notes and Posts from Session Storage
let personalNotes = JSON.parse(sessionStorage.getItem(PERSONAL_NOTES_KEY)) || [];
let publicPosts = JSON.parse(sessionStorage.getItem(PUBLIC_POSTS_KEY)) || [];

let currentUser = 'A'; // Default user

function toggleUser() {
  currentUser = currentUser === 'A' ? 'B' : 'A';
  document.getElementById('current-user-indicator').innerText = `Active User: ${currentUser}`;
}

// Render Personal Notes (WhatsApp-inspired)
function renderPersonalNotes() {
  chatContainer.innerHTML = personalNotes
    .map((note) => {
      const avatarUrl = note.user === 'A' 
        ? 'https://i.pravatar.cc/40?img=1' 
        : 'https://i.pravatar.cc/40?img=2';
      return `
        <div class="flex items-start gap-2">
          <img src="${avatarUrl}" alt="Avatar" class="w-8 h-8 rounded-full">
          <div class="chat-bubble ${note.user === 'A' ? 'user-a' : 'user-b'}">
            <div>
              <span class="user-label font-bold">${note.user === currentUser ? 'You' : 'Other'}</span>
            </div>
            <div class="mt-1">${note.text}</div>
            <div class="timestamp mt-1">${note.time}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

// Render Public Posts (Twitter-inspired)
function renderPublicPosts() {
  postContainer.innerHTML = publicPosts
    .map((post) => {
      const avatarUrl = post.user === 'A' 
        ? 'https://i.pravatar.cc/40?img=1' 
        : 'https://i.pravatar.cc/40?img=2';
      return `
        <div class="post">
          <div class="post-header flex items-center gap-3">
            <img src="${avatarUrl}" alt="Avatar" class="w-10 h-10 rounded-full">
            <div>
              <div class="username font-bold">Speaker</div>
              <div class="timestamp text-xs text-gray-500">${post.time}</div>
            </div>
          </div>
          <div class="post-content mt-2">${post.text}</div>
          <div class="post-actions mt-2 flex gap-4">
            <button><i class="ri-heart-line"></i></button>
            <button><i class="ri-chat-3-line"></i></button>
            <button><i class="ri-bookmark-line"></i></button>
          </div>
        </div>
      `;
    })
    .join('');
}

// Add Personal Note
function addPersonalNote() {
  const text = personalInput.value.trim();
  if (text) {
    const time = new Date().toLocaleTimeString();
    personalNotes.push({ text, time, user: currentUser });
    sessionStorage.setItem(PERSONAL_NOTES_KEY, JSON.stringify(personalNotes));
    renderPersonalNotes();
    personalInput.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

// Add Public Post
function addPublicPost() {
  const text = publicInput.value.trim();
  if (text) {
    const time = new Date().toLocaleTimeString();
    const user = publicPosts.length % 2 === 0 ? 'A' : 'B';
    publicPosts.push({ text, time, user });
    sessionStorage.setItem(PUBLIC_POSTS_KEY, JSON.stringify(publicPosts));
    renderPublicPosts();
    publicInput.value = '';
  }
}

// Clear All
function clearAll() {
  personalNotes = [];
  publicPosts = [];
  sessionStorage.removeItem(PERSONAL_NOTES_KEY);
  sessionStorage.removeItem(PUBLIC_POSTS_KEY);
  renderPersonalNotes();
  renderPublicPosts();
}

// Toggle Modes
modeToggle.addEventListener('click', () => {
  personalMode.classList.toggle('hidden');
  publicMode.classList.toggle('hidden');
});

// Dark Mode Toggle
darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  darkModeToggle.innerHTML = document.body.classList.contains('dark') 
    ? '<i class="ri-sun-line"></i>' 
    : '<i class="ri-moon-line"></i>';
});

// Initial Render
renderPersonalNotes();
renderPublicPosts();
