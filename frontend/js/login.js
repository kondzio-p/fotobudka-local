document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    try {
      const resp = await fetch('http://localhost:4000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!resp.ok) {
        alert('Błędny login lub hasło');
        return;
      }
      const data = await resp.json();
      localStorage.setItem('token', data.token);
      window.location.href = '/adminPanel/adminPanel.html';
    } catch (error) {
      console.error(error);
      alert('Błąd połączenia');
    }
  });
});
