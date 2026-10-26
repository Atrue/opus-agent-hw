function DashboardPage({ email, onLogout }) {
  return (
    <main className="dashboard-page">
      <h1>Дашборд</h1>
      <p>{`Вы вошли как ${email}`}</p>
      <button type="button" onClick={onLogout}>
        Выйти
      </button>
    </main>
  );
}

export default DashboardPage;
