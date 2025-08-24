// ==UserScript==
// @name         Prismax Auto Enter
// @namespace    prismax-auto
// @version      1.0.0
// @match        *://*.prismax.ai/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SCAN_INTERVAL_MS = 100;
  const CLICK_DELAY_MS = [500, 3000];
  const HOLD_MS = [3000, 7000];
  const GAP_MS = [0, 500];
  const REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randRange = ([min, max]) => rand(min, max);
  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const keys = ['q', 'w', 'e', 'a', 's', 'd', 'z', 'x', 'c', 'v'];

  const keyMeta = (k) => {
    const upper = k.toUpperCase();
    return {
      key: k,
      code: `Key${upper}`,
      keyCode: upper.charCodeAt(0),
      which: upper.charCodeAt(0)
    };
  };

  const dispatchKeyEvent = (type, meta) => {
    const ev = new KeyboardEvent(type, {
      key: meta.key,
      code: meta.code,
      keyCode: meta.keyCode,
      which: meta.which,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    Object.defineProperty(ev, 'keyCode', { get: () => meta.keyCode });
    Object.defineProperty(ev, 'which', { get: () => meta.which });

    const target = document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : document.body;

    target.dispatchEvent(ev);
    window.dispatchEvent(ev);
    document.dispatchEvent(ev);
  };

  async function pressKeyRandom() {
    const k = keys[rand(0, keys.length - 1)];
    const meta = keyMeta(k);
    const hold = randRange(HOLD_MS);

    dispatchKeyEvent('keydown', meta);
    dispatchKeyEvent('keypress', meta);
    await sleep(hold);
    dispatchKeyEvent('keyup', meta);
  }

  let clickPending = false;

  function findEnterButton() {
    const candidates = Array.from(document.querySelectorAll('button.QueuePanel_joinButton__TTGQ4'));
    const btn = candidates.find(b => (b.textContent || '').trim().includes('Enter Live Control')) || candidates[0];
    return btn || null;
  }

  function checkQueueAndRefresh() {
    try {
      const queueText = document.querySelector('div.QueuePanel_timeText__dRQ6x');
      if (!queueText) return;

      const text = queueText.textContent || '';
      if (text.includes("You are now in the queue") && text.includes("users in front of you")) {
        const span = queueText.querySelector('span');
        if (span) {
          const userCount = parseInt(span.textContent);
          if (userCount === 0) {
            const lastRefresh = localStorage.getItem('last_refresh');
            const now = Date.now();
            
            if (!lastRefresh || (now - parseInt(lastRefresh)) >= REFRESH_COOLDOWN_MS) {
              localStorage.setItem('last_refresh', now.toString());
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            } else {
              const remainingTime = Math.ceil((REFRESH_COOLDOWN_MS - (now - parseInt(lastRefresh))) / 1000);
            }
          }
        }
      }
    } catch (e) {
      console.error('[Prismax Auto Enter] Sıra kontrolü hatası:', e);
    }
  }

  async function scannerLoop() {
    try {
      checkQueueAndRefresh();
      const btn = findEnterButton();
      if (btn && !clickPending) {
        clickPending = true;
        const delay = randRange(CLICK_DELAY_MS);
        setTimeout(() => {
          try {
            const rect = btn.getBoundingClientRect();
            const visible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(btn).visibility !== 'hidden';
            if (visible) {
              btn.click();
            }
          } catch (e) {
          } finally {
            clickPending = false;
          }
        }, delay);
      }
    } catch (e) {
    }
  }

  let typingEnabled = true;
  async function typingLoop() {
    while (true) {
      if (typingEnabled) {
        await pressKeyRandom();
        await sleep(randRange(GAP_MS));
      } else {
        await sleep(200);
      }
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      typingEnabled = !typingEnabled;
    }
  });

  setInterval(() => {
    if (document.visibilityState === 'visible') window.focus();
  }, 1500);

  setInterval(scannerLoop, SCAN_INTERVAL_MS);
  typingLoop();
})();
