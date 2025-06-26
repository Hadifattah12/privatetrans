// profile.ts

import '../styles/profile.css';

export async function renderProfile(): Promise<HTMLElement> {
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  const container = document.createElement('div');
  container.className = 'profile-wrapper';
  document.body.className = '';

  container.innerHTML = `
    <button class="back-arrow" onclick="location.hash = '/home';">⬅ Home</button>
    <div class="profile-container">
      <h1 class="profile-title">👤 My Profile</h1>

      <div class="avatar-section">
        <img id="avatarPreview" src="${user?.avatar ? `https://localhost:3000${user.avatar}` : '../photo/img_avatar.png'}" alt="Avatar" class="avatar-img">
        <input type="file" id="avatarInput" accept="image/*" />
      </div>

      <div class="info-section">
        <h2>📝 Update Info</h2>
        <label>Display Name:</label><input id="nameInput" type="text" value="${user?.name || ''}" />
        <label>Email:</label><input id="emailInput" type="email" value="${user?.email || ''}" />
        <label>New Password:</label><input id="passwordInput" type="password" placeholder="New password" />
        <label>Confirm Password:</label><input id="confirmPasswordInput" type="password" placeholder="Confirm new password" />
        <button id="saveProfileBtn">💾 Save Changes</button>
      </div>
      <div class="twofa-section">
      <h2>🔐 Two-Factor Authentication</h2>
      <p>Secure your account by enabling 2FA (email verification code on login).</p>
      <button id="toggle2FA">Loading...</button>
      </div>

      <div class="stats-section">
        <h3>🏆 Stats</h3>
        <p>Wins: <span id="wins">--</span></p>
        <p>Losses: <span id="losses">--</span></p>
      </div>

      <div class="match-history-section">
        <h3>📜 Match History</h3>
        <ul id="matchHistoryList"></ul>
      </div>

      <div class="friend-section">
        <h3>👥 Friends</h3>
        <ul id="friendList"></ul>
      </div>

      <div class="add-friend-section">
        <h3>➕ Add Friend</h3>
        <input type="text" id="searchInput" placeholder="Enter name..." />
        <button id="searchBtn">Search</button>
        <ul id="searchResults"></ul>
      </div>

      <div class="pending-section">
        <h3>🕓 Pending Requests</h3>
        <ul id="pendingList"></ul>
      </div>
    </div>
  `;

  const avatarInput = container.querySelector('#avatarInput') as HTMLInputElement;
  const avatarPreview = container.querySelector('#avatarPreview') as HTMLImageElement;
  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (file) avatarPreview.src = URL.createObjectURL(file);
  });

  const saveBtn = container.querySelector('#saveProfileBtn') as HTMLButtonElement;
  saveBtn.addEventListener('click', async () => {
    const name = (container.querySelector('#nameInput') as HTMLInputElement).value;
    const email = (container.querySelector('#emailInput') as HTMLInputElement).value;
    const password = (container.querySelector('#passwordInput') as HTMLInputElement).value;
    const confirmPassword = (container.querySelector('#confirmPasswordInput') as HTMLInputElement).value;

    if (password && password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    if (password) formData.append('password', password);
    if (avatarInput.files?.[0]) formData.append('avatar', avatarInput.files[0]);

    try {
      const response = await fetch('https://localhost:3000/api/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      localStorage.setItem('user', JSON.stringify(data.user));
      alert("Profile updated!");
      location.reload();
    } catch (err: any) {
      alert(err.message || 'Error updating profile');
    }
  });

  const toggle2FABtn = container.querySelector('#toggle2FA') as HTMLButtonElement;

toggle2FABtn.addEventListener('click', async () => {
  const isCurrentlyEnabled = toggle2FABtn.dataset.enabled === 'true';
  const confirmText = isCurrentlyEnabled
    ? 'Are you sure you want to disable 2FA?'
    : 'Enable 2FA for added security?';

  if (!confirm(confirmText)) return;

  try {
    const res = await fetch('https://localhost:3000/api/profile/2fa', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ enable2FA: !isCurrentlyEnabled })
    });

    const data = await res.json();
   if (res.ok) {
  alert(data.message || '2FA setting updated!');

  // Update button directly without waiting for fetch
  const newStatus = !isCurrentlyEnabled;
  toggle2FABtn.textContent = newStatus ? '❌ Disable 2FA' : '✅ Enable 2FA';
  toggle2FABtn.dataset.enabled = newStatus ? 'true' : 'false';
  toggle2FABtn.classList.remove('enable', 'disable');
  toggle2FABtn.classList.add(newStatus ? 'disable' : 'enable');
}
else {
      alert(data.error || 'Failed to update 2FA setting.');
    }
  } catch {
    alert('Server error while updating 2FA');
  }
});



  // Load friends with remove functionality
  async function loadFriends() {
    try {
      const res = await fetch('https://localhost:3000/api/friends', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const friends = await res.json();

      const list = container.querySelector('#friendList')!;
      list.innerHTML = '';
      
      friends.forEach((friend: any) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <img src="https://localhost:3000${friend.avatar}" class="avatar-mini">
          <span class="friend-name">${friend.name}</span>
          <span class="online-indicator">${friend.online ? '🟢' : '🔘'}</span>
          <button class="remove-friend-btn" data-id="${friend.id}">❌ Remove</button>`;
        list.appendChild(li);
      });

      // Add remove friend functionality
      list.querySelectorAll('.remove-friend-btn').forEach(button => {
        button.addEventListener('click', async () => {
          const friendId = (button as HTMLButtonElement).dataset.id;
          const friendName = (button.parentElement?.querySelector('.friend-name') as HTMLElement)?.textContent;
          
          if (confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
            try {
              const res = await fetch(`https://localhost:3000/api/friends/${friendId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
              });
              const data = await res.json();
              if (res.ok) {
                alert(data.message || 'Friend removed successfully!');
                loadFriends(); // Reload friends list
              } else {
                alert(data.error || 'Failed to remove friend');
              }
            } catch {
              alert('Failed to remove friend');
            }
          }
        });
      });
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  }
async function fetchAndSet2FAStatus() {
  const toggleBtn = container.querySelector('#toggle2FA') as HTMLButtonElement;
  try {
    const res = await fetch('https://localhost:3000/api/profile', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    // console.log('Fetched profile:', data.user); // ✅ check if is2FAEnabled exists

    const isEnabled = data.user?.is2FAEnabled;

    toggleBtn.textContent = isEnabled ? '❌ Disable 2FA' : '✅ Enable 2FA';
    toggleBtn.dataset.enabled = isEnabled ? 'true' : 'false';

    toggleBtn.classList.remove('enable', 'disable');
    toggleBtn.classList.add(isEnabled ? 'disable' : 'enable');
  } catch {
    toggleBtn.textContent = 'Failed to load';
    toggleBtn.disabled = true;
  }
}



  await loadFriends();
  await fetchAndSet2FAStatus();

  // Friend search with status checking
  const searchBtn = container.querySelector('#searchBtn') as HTMLButtonElement;
  const searchInput = container.querySelector('#searchInput') as HTMLInputElement;
  const resultList = container.querySelector('#searchResults') as HTMLUListElement;
  
  searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
      const res = await fetch(`https://localhost:3000/api/friends/search?name=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const users = await res.json();
      resultList.innerHTML = '';
      
      users.forEach((user: any) => {
        const li = document.createElement('li');
        let buttonHtml = '';
        let statusText = '';

        switch (user.friendship_status) {
          case 'friends':
            buttonHtml = `<span class="status-badge friends">✅ Friends</span>`;
            statusText = 'Already friends';
            break;
          case 'pending_sent':
            buttonHtml = `<span class="status-badge pending">⏳ Request Sent</span>`;
            statusText = 'Friend request sent';
            break;
          case 'pending_received':
            buttonHtml = `<span class="status-badge pending">📩 Pending Response</span>`;
            statusText = 'They sent you a request';
            break;
          default:
            buttonHtml = `<button class="add-friend-btn" data-id="${user.id}">Add Friend</button>`;
            statusText = 'Can add as friend';
        }

        li.innerHTML = `
          <img src="https://localhost:3000${user.avatar}" class="avatar-mini">
          <span class="friend-name">${user.name}</span>
          <span class="friendship-status">${statusText}</span>
          ${buttonHtml}`;
        resultList.appendChild(li);
      });

      // Add friend functionality (only for users who can be added)
      resultList.querySelectorAll('.add-friend-btn').forEach(button => {
        button.addEventListener('click', async () => {
          const id = (button as HTMLButtonElement).dataset.id;
          try {
            const res = await fetch(`https://localhost:3000/api/friends/${id}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (res.ok) {
              alert(data.message || 'Friend request sent!');
              // Re-search to update the status
              searchBtn.click();
            } else {
              alert(data.error || 'Failed to send request');
            }
          } catch {
            alert('Failed to send request');
          }
        });
      });
    } catch (err) {
      console.error('Search failed:', err);
    }
  });

  // Allow search on Enter key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBtn.click();
    }
  });

  // Pending requests
  async function loadPendingRequests() {
    try {
      const res = await fetch('https://localhost:3000/api/friends/requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const requests = await res.json();
      const pendingList = container.querySelector('#pendingList')!;
      pendingList.innerHTML = '';
      
      requests.forEach((req: any) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <img src="https://localhost:3000${req.avatar}" class="avatar-mini">
          <span class="friend-name">${req.name}</span>
          <span class="request-text">wants to be friends</span>
          <button class="approve-btn" data-id="${req.id}">✅</button>
          <button class="reject-btn" data-id="${req.id}">❌</button>`;
        pendingList.appendChild(li);
      });

      pendingList.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', async () => {
          const id = (button as HTMLButtonElement).dataset.id;
          try {
            const res = await fetch(`https://localhost:3000/api/friends/approve/${id}`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            alert(data.message || 'Friend approved!');
            loadPendingRequests();
            loadFriends();
          } catch {
            alert('Failed to approve request');
          }
        });
      });

      pendingList.querySelectorAll('.reject-btn').forEach(button => {
        button.addEventListener('click', async () => {
          const id = (button as HTMLButtonElement).dataset.id;
          try {
            const res = await fetch(`https://localhost:3000/api/friends/reject/${id}`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            alert(data.message || 'Friend rejected.');
            loadPendingRequests();
          } catch {
            alert('Failed to reject request');
          }
        });
      });
    } catch (err) {
      console.error('Failed to load pending requests:', err);
    }
  }

  await loadPendingRequests();

  return container;
}