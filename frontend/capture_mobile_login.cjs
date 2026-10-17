const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureMobileLogin(resolutions, targetUrl = 'http://localhost:5173/login', prefix = 'mobile_login') {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join(__dirname, '.chrome-mob-login-' + Date.now());
  const port = 9777;

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ]);

  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          targets = list;
          break;
        }
      } catch (e) {}
    }

    if (!targets) {
      throw new Error('Chrome did not start in time');
    }

    const pageTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension')) || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise((resolve) => ws.onopen = resolve);

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('DOM.enable');

    await send('Page.navigate', { url: targetUrl });
    await sleep(2500);

    for (const res of resolutions) {
      console.log(`Capturing mobile login ${res.width}x${res.height}...`);
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: 2,
        mobile: true,
      });

      await sleep(1000);

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(shot.data, 'base64');
      const filename = path.join(__dirname, `${prefix}_${res.width}_${res.height}.png`);
      fs.writeFileSync(filename, buffer);
      console.log(`Saved ${filename}`);
    }

    ws.close();
  } finally {
    chrome.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

captureMobileLogin([
  { width: 390, height: 844 },
  { width: 320, height: 568 },
])
  .then(() => console.log('Mobile login test complete!'))
  .catch((err) => console.error(err));
