'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, makeResponse } = require('./helpers/harness');

const PROFILE = { email: 'u@mail.ru', gender: 'female', age: 30, height: 170, weight: 60.5,
  allergens: ['LACTOSE', 'EGGS'], preferences: ['VEGAN'] };
const get = (status, body) => async (url, o) => makeResponse({ status, body });

async function boot(opts) { const p = load('profile.js', opts); await p.settle(); return p; }

test('profile.js: без токена — редирект на login.html', () => {
  const p = load('profile.js', { fetchImpl: get(401, '') });
  assert.equal(p.location.href, 'login.html');
});

test('profile.js: профиль загружается с Bearer-токеном, поля заполняются', async () => {
  const p = await boot({ token: 'T', fetchImpl: get(200, PROFILE) });
  assert.equal(p.fetchCalls[0].url, '/api/users/profile');
  assert.equal(p.fetchCalls[0].options.headers.Authorization, 'Bearer T');
  assert.equal(p.el('email').value, 'u@mail.ru');
  assert.equal(p.el('gender').value, 'female');
  assert.equal(p.el('age').value, 30);
  assert.equal(p.el('height').value, 170);
  assert.equal(p.el('weight').value, 60.5);
});

test('profile.js: отмеченные аллергены и предпочтения рисуются как checked', async () => {
  const p = await boot({ token: 'T', fetchImpl: get(200, PROFILE) });
  const a = p.el('allergens-container').innerHTML;
  assert.match(a, /value="LACTOSE"\s+checked/); assert.match(a, /value="EGGS"\s+checked/);
  assert.doesNotMatch(a, /value="GLUTEN"\s+checked/);
  assert.match(p.el('preferences-container').innerHTML, /value="VEGAN"\s+checked/);
});

test('profile.js: новый пользователь (пустой профиль) — пол по умолчанию male, поля пустые', async () => {
  const p = await boot({ token: 'T', fetchImpl: get(200, { email: 'n@n.ru', gender: null, age: null, height: null, weight: null, allergens: [], preferences: [] }) });
  assert.equal(p.el('gender').value, 'male');
  assert.equal(p.el('age').value, '');
});

test('profile.js: 401 — токен удаляется, редирект на login.html', async () => {
  const p = await boot({ token: 'OLD', fetchImpl: get(401, 'x') });
  assert.equal(p.storage.has('token'), false);
  assert.equal(p.location.href, 'login.html');
});

test('profile.js: сетевая ошибка — сообщение об ошибке', async () => {
  const p = await boot({ token: 'T', fetchImpl: async () => { throw new Error('x'); } });
  assert.match(p.el('statusMessage').textContent, /Сервер временно недоступен/);
  assert.equal(p.el('statusMessage').style.color, '#c62828');
});

test('profile.js: сохранение — PUT с выбранными чекбоксами и числами', async () => {
  const p = await boot({ token: 'T', fetchImpl: async (u, o) => (o && o.method === 'PUT' ? makeResponse({ status: 200, body: PROFILE }) : makeResponse({ status: 200, body: PROFILE })) });
  p.el('gender').value = 'male'; p.el('age').value = '25'; p.el('height').value = '180'; p.el('weight').value = '75.5';
  p.checked.allergens = [{ value: 'GLUTEN' }, { value: 'SOY' }];
  p.checked.preferences = [{ value: 'HIGH_PROTEIN' }];
  const ev = p.el('profileForm').dispatch('submit'); await p.settle();
  assert.equal(ev.defaultPrevented, true);
  const put = p.fetchCalls.find(c => c.options.method === 'PUT');
  assert.equal(put.options.headers.Authorization, 'Bearer T');
  assert.deepEqual(JSON.parse(put.options.body), { gender: 'male', age: 25, height: 180, weight: 75.5, allergens: ['GLUTEN', 'SOY'], preferences: ['HIGH_PROTEIN'] });
  assert.equal(JSON.parse(put.options.body).email, undefined, 'email не должен отправляться');
  assert.equal(p.el('statusMessage').textContent, 'Профиль успешно сохранен!');
  assert.equal(p.el('statusMessage').style.color, '#2e7d32');
  assert.equal(p.el('saveBtn').disabled, false);
  assert.equal(p.el('saveBtn').textContent, 'Сохранить изменения');
});

test('profile.js: ошибка сохранения — показывается текст сервера', async () => {
  const p = await boot({ token: 'T', fetchImpl: async (u, o) => (o && o.method === 'PUT' ? makeResponse({ status: 400, body: 'Неверные данные' }) : makeResponse({ status: 200, body: PROFILE })) });
  p.el('profileForm').dispatch('submit'); await p.settle();
  assert.equal(p.el('statusMessage').textContent, 'Неверные данные');
  assert.equal(p.el('statusMessage').style.color, '#c62828');
});

test('profile.js: сообщение скрывается через 3 секунды', async () => {
  const p = await boot({ token: 'T', fetchImpl: get(200, PROFILE) });
  p.el('profileForm').dispatch('submit'); await p.settle(); await p.flushTimers();
  assert.equal(p.el('statusMessage').style.display, 'none');
});

test('profile.js: клик по чекбоксу переключает класс checked у плашки', () => {
  const p = load('profile.js', { token: 'T', fetchImpl: get(200, PROFILE) });
  const label = p.doc.constructor ? new (require('./helpers/harness').FakeElement)('label') : null;
  const cb = { type: 'checkbox', checked: true, closest: () => label };
  p.doc.dispatch('change', { target: cb }); assert.ok(label.classList.contains('checked'));
  cb.checked = false; p.doc.dispatch('change', { target: cb }); assert.ok(!label.classList.contains('checked'));
});

test('profile.js: выход очищает токен', async () => {
  const p = await boot({ token: 'T', fetchImpl: get(200, PROFILE) });
  p.el('logoutBtn').dispatch('click');
  assert.equal(p.storage.has('token'), false); assert.equal(p.location.href, 'login.html');
});

// ---- подозрительное поведение ----
test('[ДЕФЕКТ] Все аллергены, существующие на бэкенде, должны быть доступны для выбора (нет CITRUSES)', { todo: 'ALLERGENS в profile.js не содержит CITRUSES' }, async () => {
  const backend = ['GLUTEN', 'LACTOSE', 'NUTS', 'EGGS', 'FISH', 'SEAFOOD', 'SOY', 'PEANUTS', 'CITRUSES'];
  const p = await boot({ token: 'T', fetchImpl: get(200, PROFILE) });
  const keys = Object.keys(p.get('ALLERGENS'));
  assert.deepEqual(backend.filter(k => !keys.includes(k)), []);
});

test('[ДЕФЕКТ?] 403 (просроченный токен) должен вести на страницу входа, а не на «сервер недоступен»', { todo: 'обрабатывается только 401, а Spring отдаёт 403' }, async () => {
  const p = await boot({ token: 'EXPIRED', fetchImpl: get(403, '') });
  assert.equal(p.location.href, 'login.html');
});

test('[ДЕФЕКТ?] Пустые возраст/рост/вес не должны превращаться в 0 при сохранении', { todo: 'parseInt(...) || 0' }, async () => {
  const p = await boot({ token: 'T', fetchImpl: get(200, { ...PROFILE, age: null, height: null, weight: null }) });
  p.el('age').value = ''; p.el('height').value = ''; p.el('weight').value = '';
  p.el('profileForm').dispatch('submit'); await p.settle();
  const body = JSON.parse(p.fetchCalls.find(c => c.options.method === 'PUT').options.body);
  assert.notEqual(body.age, 0);
});
