import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from './DashboardPage';

test('дашборд показывает заголовок, email вошедшего и кнопку «Выйти»', () => {
  render(<DashboardPage email="user@example.com" onLogout={vi.fn()} />);

  expect(screen.getByRole('heading', { name: 'Дашборд' })).toBeInTheDocument();
  expect(screen.getByText('Вы вошли как user@example.com')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument();
});

test('клик по кнопке «Выйти» вызывает onLogout один раз', async () => {
  const user = userEvent.setup();
  const onLogout = vi.fn();
  render(<DashboardPage email="user@example.com" onLogout={onLogout} />);

  await user.click(screen.getByRole('button', { name: 'Выйти' }));

  expect(onLogout).toHaveBeenCalledTimes(1);
});
