import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [user, setUser] = useState(null);

  return user ? (
    <DashboardPage email={user.email} onLogout={() => setUser(null)} />
  ) : (
    <LoginPage onLoginSuccess={(email) => setUser({ email })} />
  );
}

export default App;
