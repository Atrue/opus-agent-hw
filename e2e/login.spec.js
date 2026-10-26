import { test, expect } from '@playwright/test';

test('пустой сабмит показывает предупреждение о незаполненных полях', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();

  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('alert')).toHaveText('Заполните email и пароль');
});

test('заполненная форма отправляется без предупреждения', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Пароль').fill('secret');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Дашборд' })).toBeVisible();
  await expect(page.getByText('Вы вошли как user@example.com')).toBeVisible();
});
