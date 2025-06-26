import '../styles/master.css';

export function renderLogin(): HTMLElement {
  const container = document.createElement('div');
  document.body.className = 'login-page';
  container.innerHTML = `
    <div class="ring">
      <i style="--clr:#00ff0a;"></i>
      <i style="--clr:#ff0057;"></i>
      <i style="--clr:#fffd44;"></i>
      <div class="login">
        <h2>Login</h2>
        <div class="inputBx">
          <input id="email" type="email" placeholder="Email" required>
        </div>
        <div class="inputBx">
          <input id="password" type="password" placeholder="Password" required>
        </div>
        <div class="inputBx">
          <input id="loginBtn" type="submit" value="Sign in">
        </div>

        <!-- 2FA verification -->
        <div id="twoFASection" style="display:none;">
          <p>Enter the 2FA code sent to your email:</p>
          <input id="twoFACode" type="text" placeholder="2FA Code">
          <button id="twoFABtn">Verify Code</button>
        </div>

        <div class="links">
          <a class="signup" href="#/signup">Signup</a>
        </div>
      </div>
    </div>
  `;

  const loginBtn = container.querySelector('#loginBtn')!;
  const twoFASection = container.querySelector('#twoFASection')!;
  const twoFABtn = container.querySelector('#twoFABtn')!;

  loginBtn.addEventListener('click', async () => {
    const email = (container.querySelector('#email') as HTMLInputElement).value.trim();
    const password = (container.querySelector('#password') as HTMLInputElement).value.trim();

    if (!email || !password) {
      alert('Please fill all fields');
      return;
    }

    try {
      const res = await fetch('https://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.is2FAEnabled) {
        (twoFASection as HTMLElement).style.display = 'block';
        loginBtn.setAttribute('disabled', 'true');
      } else {
        localStorage.setItem('token', data.token);
        location.hash = '/home';
      }
    } catch (err) {
      alert('Error connecting to server');
      console.error(err);
    }
  });

  twoFABtn.addEventListener('click', async () => {
    const email = (container.querySelector('#email') as HTMLInputElement).value.trim();
    const code = (container.querySelector('#twoFACode') as HTMLInputElement).value.trim();

    if (!code) {
      alert('Please enter the 2FA code');
      return;
    }

    try {
      const res = await fetch('https://localhost:3000/api/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || '2FA verification failed');
        return;
      }

      // Save the token after successful 2FA
      localStorage.setItem('token', data.token);
      location.hash = '/home';
    } catch (err) {
      alert('Error connecting to server');
      console.error(err);
    }
  });

  return container;
}
