const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertNoHorizontalOverflow(result, page, resolution) {
  const value = result?.result?.value || '';
  let metrics;
  try { metrics = JSON.parse(value); } catch { metrics = null; }
  if (!metrics || metrics.scrollW > metrics.clientW || !metrics.text.trim()) {
    throw new Error(`${page} did not render correctly at ${resolution.width}x${resolution.height}: ${value}`);
  }
}

const mobilePortraitResolutions = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 360, height: 800 },
  { width: 375, height: 667 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 412, height: 915 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
];

const mobileLandscapeResolutions = [
  { width: 667, height: 375 },
  { width: 812, height: 375 },
  { width: 844, height: 390 },
];

const desktopResolutions = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
];
const smoke = process.argv.includes('--smoke');
const portraitResolutions = smoke ? [{ width: 320, height: 568 }] : mobilePortraitResolutions;
const landscapeResolutions = smoke ? [] : mobileLandscapeResolutions;
const testedDesktopResolutions = smoke ? [] : desktopResolutions;
const aboutResolutions = smoke
  ? [{ width: 320, height: 568 }]
  : [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1366, height: 768 }];

async function captureAll(baseUrl = 'http://localhost:5173') {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join(__dirname, '.chrome-test-all-' + Date.now());
  const port = 9888;

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

    if (!targets) throw new Error('Chrome remote debugging did not respond');

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

    await new Promise((r) => ws.onopen = r);

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function waitForRenderedPage(page) {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const result = await send('Runtime.evaluate', {
          expression: 'JSON.stringify({readyState: document.readyState, text: document.body.innerText.trim()})',
        });
        const state = JSON.parse(result.result.value);
        if (state.readyState === 'complete' && state.text) return;
        await sleep(300);
      }
      throw new Error(`${page} did not finish rendering within 15 seconds`);
    }

    await send('Page.enable');
    await send('DOM.enable');

    const outDir = path.join(__dirname, 'test_output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    // ── 1. TEST LANDING PAGE ──────────────────────────────
    console.log('Testing Landing Page (/) ...');
    await send('Page.navigate', { url: baseUrl + '/' });
    await waitForRenderedPage('Landing page');

    // Mobile portrait
    for (const res of portraitResolutions) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await sleep(1600);
      const evalRes = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, text: document.body.innerText.slice(0, 160), html: document.body.innerHTML.slice(0, 300), readyState: document.readyState})'
      });
      assertNoHorizontalOverflow(evalRes, 'Landing page', res);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `landing_portrait_${res.width}_${res.height}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Saved landing_portrait_${res.width}_${res.height}.png [${evalRes.result.value}]`);
    }

    // Mobile landscape
    for (const res of landscapeResolutions) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await sleep(1600);
      const evalRes = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, text: document.body.innerText.slice(0, 160)})'
      });
      assertNoHorizontalOverflow(evalRes, 'Landing page', res);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `landing_landscape_${res.width}_${res.height}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Saved landing_landscape_${res.width}_${res.height}.png [${evalRes.result.value}]`);
    }

    // Desktop regression
    for (const res of testedDesktopResolutions) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await sleep(800);
      const evalRes = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, text: document.body.innerText.slice(0, 160)})'
      });
      assertNoHorizontalOverflow(evalRes, 'Landing page', res);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `landing_desktop_${res.width}_${res.height}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Saved landing_desktop_${res.width}_${res.height}.png [${evalRes.result.value}]`);
    }

    // ── 2. TEST LOGIN PAGE ────────────────────────────────
    console.log('Testing Login Page (/login) ...');
    await send('Page.navigate', { url: baseUrl + '/login' });
    await waitForRenderedPage('Login page');

    // Mobile portrait
    for (const res of portraitResolutions) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await sleep(1600);
      const evalRes = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, text: document.body.innerText.slice(0, 160), html: document.body.innerHTML.slice(0, 300), readyState: document.readyState})'
      });
      assertNoHorizontalOverflow(evalRes, 'Login page', res);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `login_portrait_${res.width}_${res.height}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Saved login_portrait_${res.width}_${res.height}.png [${evalRes.result.value}]`);
    }

    // Mobile landscape
    for (const res of landscapeResolutions) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await sleep(1600);
      const evalRes = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, text: document.body.innerText.slice(0, 160)})'
      });
      assertNoHorizontalOverflow(evalRes, 'Login page', res);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `login_landscape_${res.width}_${res.height}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Saved login_landscape_${res.width}_${res.height}.png [${evalRes.result.value}]`);
    }

    // Desktop regression
    for (const res of testedDesktopResolutions) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await sleep(800);
      const evalRes = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, text: document.body.innerText.slice(0, 160)})'
      });
      assertNoHorizontalOverflow(evalRes, 'Login page', res);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `login_desktop_${res.width}_${res.height}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Saved login_desktop_${res.width}_${res.height}.png [${evalRes.result.value}]`);
    }

    console.log('Testing About page (/about) ...');
    await send('Page.navigate', { url: baseUrl + '/about' });
    await waitForRenderedPage('About page');
    for (const res of aboutResolutions) {
      const isMobile = res.width < 768;
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.width,
        height: res.height,
        deviceScaleFactor: isMobile ? 2 : 1,
        mobile: isMobile,
      });
      await sleep(1600);
      const evalRes = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, text: document.body.innerText.slice(0, 160)})'
      });
      assertNoHorizontalOverflow(evalRes, 'About page', res);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `about_${res.width}_${res.height}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Saved about_${res.width}_${res.height}.png [${evalRes.result.value}]`);
    }

    ws.close();
    console.log('All screenshot captures completed successfully!');
  } finally {
    chrome.kill();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
  }
}

captureAll().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
