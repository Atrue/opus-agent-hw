import {
  describe, expect, test, vi,
} from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import LoginPage from './pages/LoginPage';

describe('App', () => {
  test('отображает страницу входа', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  test('отображает поля email и пароль и кнопку входа', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/пароль/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  test('показывает ошибку при пустых полях', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Заполните email и пароль');
  });

  test('не показывает ошибку при заполненных полях и сообщает об успехе', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/пароль/i), 'secret');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onLoginSuccess).toHaveBeenCalledWith('user@example.com');
  });
});
