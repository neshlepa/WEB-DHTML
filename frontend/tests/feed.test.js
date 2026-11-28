'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, makeResponse } = require('./helpers/harness');

const recipe = (id, over = {}) => ({
  id, name: 'Рецепт ' + id, photoUrl: '/img/' + id + '.jpg', time: 20, difficulty: 3,
  instruction: 'Х'.repeat(150), totalCalories: 350.6, totalProtein: 20.4, totalFat: 10.5, totalCarbohydrates: 40.2,
  ingredients: [{ name: 'Курица', amountGrams: 200 }], ...over,
});
const feedWith = (list, reactStatus = 200) => async (url) =>
  String(url).endsWith('/feed') ? makeResponse({ status: 200, body: list }) : makeResponse({ status: reactStatus, body: 'ok' });

async function boot(list, token) {
  const p = load('feed.js', { token, fetchImpl: feedWith(list) });
  await p.settle(); return p;
}

test('feed.js: гость — кнопка выхода скрыта, надпись «Гость», запрос без Authorization', async () => {
  const p = await boot([recipe(1)]);
  assert.equal(p.el('logoutBtn').style.display, 'none');
  assert.equal(p.el('headerEmail').textContent, 'Гость');
  assert.equal(p.fetchCalls[0].url, '/api/recipes/feed');
  assert.equal(p.fetchCalls[0].options.headers.Authorization, undefined);
});

test('feed.js: авторизованный — токен уходит в Authorization: Bearer', async () => {
  const p = await boot([recipe(1)], 'TKN');
  assert.equal(p.el('headerEmail').textContent, 'Мой аккаунт');
  assert.equal(p.fetchCalls[0].options.headers.Authorization, 'Bearer TKN');
});

test('feed.js: карточка — КБЖУ округляется, сложность звёздами, инструкция обрезается до 100 символов', async () => {
  const p = await boot([recipe(1, { difficulty: 2 })]);
  const html = p.el('cardWrapper').innerHTML;
  assert.match(html, /<b>351<\/b><br>ККАЛ/);
  assert.match(html, /<b>20г<\/b><br>БЕЛКИ/);
  assert.match(html, /★★☆☆☆/);
  assert.match(html, /СЛОЖНОСТЬ: 2\/5/);
  assert.match(html, /20 мин/);
  assert.ok(html.includes('Х'.repeat(100) + '...') && !html.includes('Х'.repeat(101)));
});

test('feed.js: счётчик «осталось» равен длине ленты', async () => {
  const p = await boot([recipe(1), recipe(2), recipe(3)]);
  assert.equal(p.el('leftCount').textContent, 3);
});

test('feed.js: пустая лента — сообщение «посмотрели все рецепты»', async () => {
  const p = await boot([]);
  assert.match(p.el('cardWrapper').innerHTML, /Вы посмотрели все рецепты/);
});

test('feed.js: ошибка сервера (не 2xx) и сетевая ошибка → «Сервер временно недоступен»', async () => {
  const p1 = load('feed.js', { fetchImpl: async () => makeResponse({ status: 502, body: 'bad' }) }); await p1.settle();
  assert.match(p1.el('cardWrapper').innerHTML, /Сервер временно недоступен/);
  const p2 = load('feed.js', { fetchImpl: async () => { throw new Error('net'); } }); await p2.settle();
  assert.match(p2.el('cardWrapper').innerHTML, /Сервер временно недоступен/);
});

test('feed.js: правая панель показывает ингредиенты текущего рецепта', async () => {
  const p = await boot([recipe(1)]);
  assert.equal(p.el('upNowTitle').textContent, 'Рецепт 1');
  assert.match(p.el('upNowIngredients').innerHTML, /Курица.*200г/s);
});

test('feed.js: LIKE — POST /api/recipes/{id}/react, счётчик, мини-карточка, переход к следующей', async () => {
  const p = await boot([recipe(7), recipe(8)], 'TKN');
  await p.run("handleSwipe('LIKE')"); await p.flushTimers();
  const c = p.fetchCalls.find(x => x.url === '/api/recipes/7/react');
  assert.ok(c, 'нет запроса react');
  assert.equal(c.options.method, 'POST');
  assert.equal(c.options.headers.Authorization, 'Bearer TKN');
  assert.deepEqual(JSON.parse(c.options.body), { reaction: 'LIKE' });
  assert.equal(p.el('likedCount').textContent, 1);
  assert.equal(p.el('likedList').children.length, 1);
  assert.equal(p.get('currentIndex'), 1);
  assert.match(p.el('cardWrapper').innerHTML, /Рецепт 8/);
});

test('feed.js: DISLIKE не меняет счётчики, FAVORITE увеличивает «сохранённые»', async () => {
  const p = await boot([recipe(1), recipe(2), recipe(3)], 'T');
  await p.run("handleSwipe('DISLIKE')"); await p.flushTimers();
  assert.equal(p.el('likedCount').textContent, 0); assert.equal(p.el('savedCount').textContent, 0);
  await p.run("handleSwipe('FAVORITE')"); await p.flushTimers();
  assert.equal(p.el('savedCount').textContent, 1);
  const bodies = p.fetchCalls.filter(c => c.url.endsWith('/react')).map(c => JSON.parse(c.options.body).reaction);
  assert.deepEqual(bodies, ['DISLIKE', 'FAVORITE']);
});

test('feed.js: гость свайпает — запросов react нет, alert только на первой карточке', async () => {
  const p = await boot([recipe(1), recipe(2), recipe(3)]);
  await p.run("handleSwipe('LIKE')"); await p.flushTimers();
  await p.run("handleSwipe('LIKE')"); await p.flushTimers();
  assert.equal(p.fetchCalls.filter(c => c.url.endsWith('/react')).length, 0);
  assert.equal(p.alerts.length, 1);
});

test('feed.js: после последней карточки лента подгружается заново', async () => {
  const p = await boot([recipe(1)], 'T');
  await p.run("handleSwipe('DISLIKE')"); await p.flushTimers();
  assert.equal(p.fetchCalls.filter(c => c.url === '/api/recipes/feed').length, 2);
});

test('feed.js: выход удаляет токен и ведёт на login.html', async () => {
  const p = await boot([recipe(1)], 'T');
  p.el('logoutBtn').dispatch('click');
  assert.equal(p.storage.has('token'), false);
  assert.equal(p.location.href, 'login.html');
});

// ---- жесты ----
async function drag(p, dx, dy) {
  const card = p.card();
  card.dispatch('pointerdown', { clientX: 0, clientY: 0, pointerId: 1 });
  card.dispatch('pointermove', { clientX: dx, clientY: dy });
  card.dispatch('pointerup', { clientX: dx, clientY: dy });
  await p.settle(); await p.flushTimers();
}
const reactions = p => p.fetchCalls.filter(c => c.url.endsWith('/react')).map(c => JSON.parse(c.options.body).reaction);

test('feed.js: жесты — вправо LIKE, влево DISLIKE, вверх FAVORITE', async () => {
  for (const [dx, dy, expected] of [[150, 0, 'LIKE'], [-150, 0, 'DISLIKE'], [0, -150, 'FAVORITE']]) {
    const p = await boot([recipe(1), recipe(2)], 'T');
    await drag(p, dx, dy);
    assert.deepEqual(reactions(p), [expected], `жест (${dx},${dy})`);
  }
});

test('feed.js: короткий свайп (<100px) не засчитывается, карточка возвращается', async () => {
  const p = await boot([recipe(1), recipe(2)], 'T');
  await drag(p, 60, 0);
  assert.deepEqual(reactions(p), []);
  assert.equal(p.get('currentIndex'), 0);
});

test('feed.js: граница порога — ровно 100px не засчитывается, 101px засчитывается', async () => {
  const a = await boot([recipe(1), recipe(2)], 'T'); await drag(a, 100, 0);
  assert.deepEqual(reactions(a), []);
  const b = await boot([recipe(1), recipe(2)], 'T'); await drag(b, 101, 0);
  assert.deepEqual(reactions(b), ['LIKE']);
});

// ---- подозрительное поведение ----
test('[ДЕФЕКТ?] Реакция, отклонённая сервером (403 при просроченном токене), не должна теряться молча', { todo: 'ответ react не проверяется' }, async () => {
  const p = load('feed.js', { token: 'EXPIRED', fetchImpl: feedWith([recipe(1), recipe(2)], 403) }); await p.settle();
  await p.run("handleSwipe('LIKE')"); await p.flushTimers();
  const informed = p.alerts.length > 0 || p.location.href === 'login.html' || /ошиб|войд/i.test(p.el('cardWrapper').innerHTML);
  assert.ok(informed, 'пользователь не узнал, что лайк не сохранён');
});

test('[ДЕФЕКТ?] Название рецепта вставляется через innerHTML без экранирования', { todo: 'потенциальный XSS' }, async () => {
  const p = await boot([recipe(1, { name: '<img src=x onerror=alert(1)>' })]);
  assert.ok(!p.el('cardWrapper').innerHTML.includes('<img src=x onerror'));
});
