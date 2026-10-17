const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureResolutions(resolutions, targetUrl = 'http://localhost:5173/', prefix = 'screen') {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join(__dirname, '.chrome-temp-' + Date.now());
  const port = 9444;

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
      throw new Error('Chrome did not start remote debugging port in time');
    }

    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);
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

    console.log(`Navigating to ${targetUrl}...`);
    await send('Page.navigate', { url: targetUrl });
    await sleep(2500);

    for (const res of resolutions) {
      console.log(`Capturing ${res.width}x${res.height}...`);
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: 1,
        mobile: false,
      });

      // Wait for resize and re-render
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

const targetResolutions = [
  { width: 1366, height: 768 },
  { width: 1366, height: 800 },
  { width: 1440, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 768 },
  { width: 1536, height: 864 },
  { width: 1536, height: 900 },
  { width: 1536, height: 959 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 },
];

captureResolutions(targetResolutions)
  .then(() => console.log('All captures complete!'))
  .catch((err) => console.error('Capture error:', err));
