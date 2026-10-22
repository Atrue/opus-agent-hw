import { useState } from 'react';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Заполните email и пароль');
      return;
    }
    // Заглушка: реальная авторизация будет добавлена позже.
    // Поведение формы покрыто тестами: src/App.test.jsx (юниты) и e2e/login.spec.js (browser).
    setError('');
    console.log('login', { email });
  };

  return (
    <main className="login-page">
      <h1>Вход</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p role="alert">{error}</p>}
        <button type="submit">Войти</button>
      </form>
    </main>
  );
}

export default LoginPage;
