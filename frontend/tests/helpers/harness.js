'use strict';
// Мини-«браузер» для запуска js/*.js фронтенда без установки jsdom/Jest.
// Работает на встроенном node:test (Node 18+).
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const JS_DIR = process.env.FRONTEND_JS_DIR || path.resolve(__dirname, '../../js');

class FakeElement {
  constructor(id) {
    this.id = id; this.style = {}; this.textContent = ''; this.value = '';
    this.disabled = false; this.className = ''; this.children = []; this.listeners = {};
    this._inner = ''; this.dataset = {};
    const set = new Set();
    this.classList = { add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c) };
    this.onInnerHTML = null;
  }
  get innerHTML() { return this._inner; }
  set innerHTML(v) { this._inner = v; if (this.onInnerHTML) this.onInnerHTML(v); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatch(type, ev = {}) {
    const e = Object.assign({ preventDefault() { e.defaultPrevented = true; }, target: this }, ev);
    for (const fn of this.listeners[type] || []) fn(e);
    return e;
  }
  prepend(child) { this.children.unshift(child); }
  setPointerCapture() {}
  closest() { return this._closest || this; }
}

function makeResponse({ status = 200, body = '' } = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, text: async () => text, json: async () => JSON.parse(text) };
}

/**
 * @param {string} script  'auth.js' | 'feed.js' | 'profile.js'
 * @param {object} opts    { token, fetchImpl }
 */
function load(script, opts = {}) {
  const els = new Map();
  const timers = [];
  const alerts = [];
  const fetchCalls = [];
  const storage = new Map(); if (opts.token) storage.set('token', opts.token);
  const location = { href: '' };
  const checked = { allergens: [], preferences: [] };

  const doc = new FakeElement('document');
  const card = { current: null };
  doc.getElementById = id => {
    if (id === 'currentCard') {            // карточка существует только пока она есть в разметке
      const w = els.get('cardWrapper');
      if (!w || !w.innerHTML.includes('id="currentCard"')) return null;
      return card.current;
    }
    if (!els.has(id)) {
      const e = new FakeElement(id); els.set(id, e);
      if (id === 'cardWrapper') e.onInnerHTML = () => { card.current = new FakeElement('currentCard'); };
    }
    return els.get(id);
  };
  doc.createElement = tag => new FakeElement(tag);
  doc.querySelectorAll = sel => {
    const m = /name="(\w+)"/.exec(sel);
    return m ? (checked[m[1]] || []) : [];
  };

  const fetchImpl = opts.fetchImpl || (async () => makeResponse({ status: 200, body: [] }));
  const ctx = vm.createContext({
    document: doc,
    window: { location },
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k),
    },
    fetch: (...a) => { fetchCalls.push({ url: a[0], options: a[1] || {} }); return fetchImpl(...a); },
    alert: m => alerts.push(m),
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    console: { log() {}, error() {}, warn() {} },
    parseInt, parseFloat, Math, JSON, Array, Object, Number, String, Error, Promise,
  });
  // login.html/profile.html/main.html: нужные элементы создаются лениво через getElementById
  const code = fs.readFileSync(path.join(JS_DIR, script), 'utf8');
  vm.runInContext(code, ctx, { filename: require('node:url').pathToFileURL(path.join(JS_DIR, script)).href });

  return {
    ctx, doc, el: id => doc.getElementById(id), card: () => doc.getElementById('currentCard'),
    fetchCalls, alerts, location, storage, checked,
    get: expr => vm.runInContext(expr, ctx),          // читать let/const/функции из скрипта
    run: expr => vm.runInContext(expr, ctx),
    async settle(n = 8) { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); },
    async flushTimers() {
      let guard = 0;
      while (timers.length && guard++ < 50) { const t = timers.shift(); t.fn(); await this.settle(); }
    },
  };
}

module.exports = { load, makeResponse, FakeElement };
