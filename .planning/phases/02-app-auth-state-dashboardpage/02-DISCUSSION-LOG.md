# Phase 2: App Auth State + DashboardPage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-26
**Phase:** 2-App Auth State + DashboardPage
**Areas discussed:** Контент дашборда, Поведение logout, Форма user state

---

## Контент дашборда

### Заголовок (h1)

| Option | Description | Selected |
|--------|-------------|----------|
| «Дашборд» | Прямое название страницы, соответствует имени компонента DashboardPage; тесты ищут heading «Дашборд» | ✓ |
| «Главная» | Более «продуктовое» название страницы | |
| «Dashboard» | Латиницей, если захочется отличить заглушку стенда от прод-копирайта | |

**User's choice:** «Дашборд»
**Notes:** Recommended option accepted.

### Отображение email

| Option | Description | Selected |
|--------|-------------|----------|
| «Вы вошли как {email}» | Одна строка <p> под заголовком — минимум разметки, легко искать в тестах по тексту | ✓ |
| Отдельный блок с подписью | Email как отдельный визуальный блок (dl или p с классом) | |

**User's choice:** «Вы вошли как {email}»
**Notes:** Preview mockup confirmed: `<h1>Дашборд</h1>`, `<p>Вы вошли как user@example.com</p>`, `<button>Выйти</button>`.

### Подпись кнопки logout

| Option | Description | Selected |
|--------|-------------|----------|
| «Выйти» | Короткая и однозначная; e2e Phase 4 кликает getByRole('button', { name: 'Выйти' }) | ✓ |
| «Выйти из аккаунта» | Более формальный вариант подписи | |
| «Logout» | Латиницей, в том же стиле что и заголовок | |

**User's choice:** «Выйти»
**Notes:** —

---

## Поведение logout

### Поля формы после logout

| Option | Description | Selected |
|--------|-------------|----------|
| Сброс — пустые поля | LoginPage размонтируется при переходе на дашборд, при logout монтируется заново с пустыми полями; ноль кода | ✓ |
| Сохранить email | Потребовало бы подъёма состояния полей в App или localStorage (против Out of Scope по persistence) | |

**User's choice:** Сброс — пустые поля
**Notes:** —

### Form-level ошибка при logout

| Option | Description | Selected |
|--------|-------------|----------|
| Исчезает естественно | Ошибка живёт внутри LoginPage — при размонтировании исчезает, допкод не нужен | ✓ |
| Сохранять между сессиями | Требует переноса error-state в App — противоречит паттерну «errors живут внутри LoginPage» | |

**User's choice:** Исчезает естественно
**Notes:** —

---

## Форма user state

### Форма auth-state в App.jsx

| Option | Description | Selected |
|--------|-------------|----------|
| user: { email } \| null | useState(null); вход setUser({ email }), выход setUser(null). Устойчиво к будущим полям, семантично | ✓ |
| Просто строка email \| null | Минимальнее, но второе поле пользователя потребует рефакторинга контракта | |
| view + email раздельно | Два источника истины для одного перехода — легко рассинхронизировать | |

**User's choice:** user: { email } | null
**Notes:** —

### Контракт LoginPage → App

| Option | Description | Selected |
|--------|-------------|----------|
| onLoginSuccess(email) | Как в плане 02-01: App делает setUser({ email }); пароль наружу не выходит | ✓ |
| Полный объект формы | onLoginSuccess({ email, password }) — пароль наверху не нужен, лишняя поверхность | |

**User's choice:** onLoginSuccess(email)
**Notes:** —

---

## Claude's Discretion

- Семантика/классы разметки DashboardPage (по аналогии с `login-page`).
- Судьба `console.log('login')` и комментария-заглушки в LoginPage.
- Объём правок существующих тестов (область «Тесты в Phase 2» не выбрана для обсуждения; рамка плана 02-01 сохранена).

## Deferred Ideas

None — discussion stayed within phase scope
