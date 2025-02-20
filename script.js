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
  // Optionally update a UI indicator
  document.getElementById('current-user-indicator').innerText = `Active User: ${currentUser}`;
}


// Render Personal Notes
function renderPersonalNotes() {
  chatContainer.innerHTML = personalNotes
    .map((note, index) => {
      const avatarUrl = note.user === 'A' 
        ? 'https://i.pravatar.cc/40?img=1' 
        : 'https://i.pravatar.cc/40?img=2';
      return `
        <div class="chat-bubble user-${note.user.toLowerCase()}">
          <div class="flex items-center gap-2">
            <img src="${avatarUrl}" alt="Avatar" class="w-6 h-6 rounded-full">
            <div>
              <span class="user-label font-bold">${note.user === currentUser ? 'You' : 'Other'}</span>: ${note.text}
            </div>
          </div>
          <div class="timestamp">${note.time}</div>
        </div>
      `;
    })
    .join('');
}


// Render Public Posts
function renderPublicPosts() {
    postContainer.innerHTML = publicPosts
      .map((post, index) => {
        const avatarUrl = post.user === 'A' 
          ? 'https://i.pravatar.cc/40?img=1' 
          : 'https://i.pravatar.cc/40?img=2';
        return `
          <div class="post">
            <div class="post-header">
              <img src="${avatarUrl}" alt="Avatar">
              <div class="username">Speaker</div>
              <div class="timestamp">${post.time}</div>
            </div>
            <div class="post-content">${post.text}</div>
            <div class="post-actions">
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

darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    darkModeToggle.innerHTML = document.body.classList.contains('dark') 
      ? '<i class="ri-sun-line"></i>' 
      : '<i class="ri-moon-line"></i>';
  });

// Initial Render
renderPersonalNotes();
renderPublicPosts();