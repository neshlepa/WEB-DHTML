'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, makeResponse } = require('./helpers/harness');

async function submit(page, email, pass) {
  page.el('email').value = email; page.el('password').value = pass;
  const ev = page.el('authForm').dispatch('submit');
  await page.settle();
  return ev;
}
const withReply = r => ({ fetchImpl: async () => (r instanceof Error ? Promise.reject(r) : makeResponse(r)) });

test('auth.js: переключение Вход ↔ Регистрация', () => {
  const p = load('auth.js');
  p.el('toggleBtn').dispatch('click');
  assert.equal(p.el('formTitle').textContent, 'Создание аккаунта');
  assert.equal(p.el('submitBtn').textContent, 'Зарегистрироваться');
  p.el('toggleBtn').dispatch('click');
  assert.equal(p.el('formTitle').textContent, 'Вход в аккаунт');
  assert.equal(p.el('submitBtn').textContent, 'Войти');
});

test('auth.js: при переключении режима ошибка скрывается', () => {
  const p = load('auth.js'); p.el('error-message').style.display = 'block';
  p.el('toggleBtn').dispatch('click');
  assert.equal(p.el('error-message').style.display, 'none');
});

test('auth.js: успешный вход сохраняет токен и ведёт на main.html', async () => {
  const p = load('auth.js', withReply({ status: 200, body: { token: 'abc.def.ghi' } }));
  const ev = await submit(p, 'user@mail.ru', 'Pass_123');
  assert.equal(ev.defaultPrevented, true, 'форма не должна перезагружать страницу');
  assert.equal(p.storage.get('token'), 'abc.def.ghi');
  assert.equal(p.location.href, 'main.html');
  const c = p.fetchCalls[0];
  assert.equal(c.url, '/api/users/login');
  assert.equal(c.options.method, 'POST');
  assert.equal(c.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(c.options.body), { email: 'user@mail.ru', password: 'Pass_123' });
});

test('auth.js: успешная регистрация — alert, возврат в режим входа, токен НЕ сохраняется', async () => {
  const p = load('auth.js', withReply({ status: 200, body: 'Пользователь успешно зарегистрирован!' }));
  p.el('toggleBtn').dispatch('click');
  await submit(p, 'new@mail.ru', 'Pass_123');
  assert.equal(p.fetchCalls[0].url, '/api/users/register');
  assert.equal(p.alerts.length, 1);
  assert.equal(p.storage.has('token'), false);
  assert.equal(p.location.href, '');
  assert.equal(p.el('formTitle').textContent, 'Вход в аккаунт');
});

test('auth.js: 401 — текст ошибки сервера показывается пользователю', async () => {
  const p = load('auth.js', withReply({ status: 401, body: 'Неверный email или пароль' }));
  await submit(p, 'a@a.ru', 'wrong');
  assert.equal(p.el('error-message').textContent, 'Неверный email или пароль');
  assert.equal(p.el('error-message').style.display, 'block');
  assert.equal(p.storage.has('token'), false);
  assert.equal(p.location.href, '');
});

test('auth.js: 400 при регистрации (слабый пароль) — сообщение показывается', async () => {
  const msg = 'Пароль может содержать только латинские буквы, цифры и знак нижнего подчеркивания';
  const p = load('auth.js', withReply({ status: 400, body: msg }));
  p.el('toggleBtn').dispatch('click');
  await submit(p, 'a@a.ru', 'пароль!');
  assert.equal(p.el('error-message').textContent, msg);
});

test('auth.js: HTML-страница nginx (502) заменяется понятным сообщением', async () => {
  const p = load('auth.js', withReply({ status: 502, body: '<html><head><title>502 Bad Gateway</title></head></html>' }));
  await submit(p, 'a@a.ru', 'x');
  assert.match(p.el('error-message').textContent, /Сервер временно недоступен/);
});

test('auth.js: сетевая ошибка', async () => {
  const p = load('auth.js', withReply(new Error('network')));
  await submit(p, 'a@a.ru', 'x');
  assert.match(p.el('error-message').textContent, /Ошибка сети/);
});

test('auth.js: 200 без токена', async () => {
  const p = load('auth.js', withReply({ status: 200, body: {} }));
  await submit(p, 'a@a.ru', 'x');
  assert.equal(p.el('error-message').textContent, 'Сервер не вернул токен');
  assert.equal(p.storage.has('token'), false);
});

test('auth.js: 200 с не-JSON при входе', async () => {
  const p = load('auth.js', withReply({ status: 200, body: 'not json' }));
  await submit(p, 'a@a.ru', 'x');
  assert.equal(p.el('error-message').textContent, 'Ошибка формата ответа сервера');
});

test('auth.js: кнопка блокируется на время запроса и восстанавливается', async () => {
  let release; const gate = new Promise(r => (release = r));
  const p = load('auth.js', { fetchImpl: async () => { await gate; return makeResponse({ status: 401, body: 'x' }); } });
  p.el('email').value = 'a'; p.el('password').value = 'b';
  p.el('authForm').dispatch('submit'); await p.settle();
  assert.equal(p.el('submitBtn').disabled, true);
  assert.equal(p.el('submitBtn').textContent, 'Загрузка...');
  release(); await p.settle();
  assert.equal(p.el('submitBtn').disabled, false);
  assert.equal(p.el('submitBtn').textContent, 'Войти');
});

// ---- Подозрительное поведение (todo: тест описывает ОЖИДАЕМОЕ, падение = дефект) ----
test('[ДЕФЕКТ?] 500 с JSON-телом Spring не должен показываться пользователю «сырым»', { todo: 'нет обработки 5xx, кроме HTML' }, async () => {
  const raw = '{"timestamp":"2026-10-24","status":500,"error":"Internal Server Error","path":"/api/users/register"}';
  const p = load('auth.js', withReply({ status: 500, body: raw }));
  p.el('toggleBtn').dispatch('click');
  await submit(p, 'a@a.ru', 'x');
  assert.notEqual(p.el('error-message').textContent, raw);
});

test('[ДЕФЕКТ?] Пустые поля не должны отправляться на сервер', { todo: 'нет клиентской валидации email/пароля' }, async () => {
  const p = load('auth.js', withReply({ status: 401, body: 'x' }));
  await submit(p, '', '');
  assert.equal(p.fetchCalls.length, 0);
});
