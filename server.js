/* =========================================================
   SC-TCG  -  YEREL (LOCAL) SUNUCU
   Star Citizen TCG kopyasini kendi bilgisayarinda calistirmak icin.
   Node.js tek dosyalik sunucu - harici paket yok.

   Kullanim:
     node server.js              -> http://localhost:4173
     node server.js 8080         -> baska port
     node server.js --lan        -> ayni Wi-Fi'daki telefondan da acilir
     node server.js --dev=1      -> admin/dev paneliyle acar (?dev=1)

   Not: Bu sunucu SADECE statik dosya servis eder. Veriler sitedeki
   supabase-config.js icindeki Supabase projesine gider (canli veri).
   ========================================================= */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// site klasorunu bul: once yaninda, sonra ucretsiz-paket kopyasinda ara
function findRoot() {
  const cand = [
    process.env.SC_TCG_ROOT,
    path.join(__dirname, 'site'),
    path.join(__dirname, '..', 'SC-TCG-inceleme', 'site'),
    path.join(__dirname, '..', 'site'),
    path.join(__dirname, '..', 'indirilen'),
  ].filter(Boolean);
  for (const c of cand) {
    try { if (fs.statSync(path.join(c, 'index.html')).isFile()) return path.resolve(c); } catch (e) {}
  }
  return path.resolve(cand[1]);
}
const ROOT = findRoot();
// v2 arayuz katmani: site\ klasorunun DISINDA durur, orijinal kopyaya hic dokunulmaz
const V2DIR = path.resolve(path.join(__dirname, 'v2'));
const args = process.argv.slice(2);
const FLAG_LAN = args.includes('--lan');
const FLAG_ONLINE = args.includes('--online') || args.includes('--mirror');
const LIVE = 'https://sc-tcg.gamer.free/';
const DEV = args.some(a => a === '--dev' || a === '--dev=1');
const PORT = parseInt(args.find(a => /^\d+$/.test(a)), 10) || 4173;
const HOST = FLAG_LAN ? '0.0.0.0' : '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.sql': 'text/plain; charset=utf-8',
};

const START = Date.now();
let served = 0, missing = 0;
const missingList = new Map();

function localIps() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) if (a.family === 'IPv4' && !a.internal) out.push(`${a.address} (${name})`);
  }
  return out;
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, Object.assign({ 'Cache-Control': 'no-store, no-cache, must-revalidate' }, headers));
  res.end(body);
}

function fetchLive(urlPath) {
  return new Promise((resolve) => {
    const url = LIVE + urlPath.split('/').map(encodeURIComponent).join('/').replace(/%20/g, '%20');
    const rq = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0 Safari/537.36', Referer: LIVE, Accept: '*/*' },
    }, r => {
      if (r.statusCode !== 200) { r.resume(); return resolve(null); }
      const c = [];
      r.on('data', d => c.push(d));
      r.on('end', () => { const b = Buffer.concat(c); resolve(b.length > 40 && !/slowAES/.test(b.toString('latin1').slice(0, 900)) ? b : null); });
    });
    rq.setTimeout(45000, () => { rq.destroy(); resolve(null); });
    rq.on('error', () => resolve(null));
  });
}

function serveFile(req, res, filePath, urlPath) {
  fs.stat(filePath, async (err, st) => {
    if (err || !st.isFile()) {
      if (FLAG_ONLINE && !urlPath.startsWith('/_local') && !urlPath.startsWith('/v2/')) {
        const buf = await fetchLive(urlPath);
        if (buf) {
          try {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            if (path.normalize(filePath).startsWith(ROOT + path.sep)) fs.writeFileSync(filePath, buf);
          } catch (e) {}
          served++;
          console.log('  +tamamlandi  ' + urlPath + '  (' + Math.round(buf.length / 1024) + ' KB)');
          res.writeHead(200, {
            'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Content-Length': buf.length,
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          });
          return res.end(buf);
        }
      }
      missing++;
      if (!missingList.has(urlPath)) {
        missingList.set(urlPath, 1);
        console.log('  404  ' + urlPath);
      }
      return send(res, 404, '404 - dosya yok (yerel sunucu): ' + urlPath, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    served++;

    // ses/video tarayicida calabilmesi ve ileri-geri sarilabilmesi icin Range (bayt araligi) destegi sart
    const rng = /bytes=(\d*)-(\d*)/.exec(String(req && req.headers ? (req.headers.range || '') : ''));
    if (rng && (rng[1] || rng[2])) {
      let start = rng[1] === '' ? 0 : parseInt(rng[1], 10);
      let end = rng[2] === '' ? st.size - 1 : parseInt(rng[2], 10);
      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end >= st.size) end = st.size - 1;
      if (start > end) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + st.size });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      const r2 = fs.createReadStream(filePath, { start, end });
      r2.on('error', () => res.destroy());
      return r2.pipe(res);
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Last-Modified': st.mtime.toUTCString(),
    });
    const rs = fs.createReadStream(filePath);
    rs.on('error', () => res.destroy());
    rs.pipe(res);
  });
}

// index.html'e v2 katmanini ekle. Orijinal dosyaya DOKUNULMAZ, sadece gonderilen HTML degisir.
// boot scripti en basa (FOUC olmasin), tema CSS'i en sona (pack.css'ten SONRA gelmesi sart).
function injectV2(html, mode) {
  const boot = '<script>window.__SC_V2_MODE=' + (mode === 'v2' ? '1' : '0') + ';</' + 'script>\n' +
    '<script src="/v2/v2-boot.js"></' + 'script>\n';
  const css = mode === 'v2'
    ? '<link rel="stylesheet" href="/v2/v2.css" />\n'
    : '';
  const app = '';   // tek betik var: v2-boot.js (tema + secici + kart efekti)
  let out = html;
  if (mode === 'saf') return out;   // hicbir sey ekleme (karsilastirma/test)
  if (/<head>/i.test(out)) out = out.replace(/<head>/i, '<head>\n' + boot);
  else out = boot + out;
  // v2 modunda pack.css'i amber cevrimlisiyle degistir (style.css DOKUNULMAZ -> kart nadirliklari aynen kalir)
  if (mode === 'v2') out = out.replace(/(<link[^>]+href=["'])pack\.css([^"']*["'][^>]*>)/i, '$1/pack.v2.css$2');
  if (css) {
    if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, css + '</head>');
    else out += css;
  }
  if (app && /<\/body>/i.test(out)) out = out.replace(/<\/body>/i, app + '</body>');
  else if (app) out += app;
  return out;
}

function serveIndex(req, res, mode) {
  fs.readFile(path.join(ROOT, 'index.html'), (err, buf) => {
    if (err) return send(res, 500, 'index.html okunamadi');
    const html = injectV2(buf.toString('utf8'), mode);
    const b = Buffer.from(html, 'utf8');
    served++;
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': b.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(b);
  });
}

const server = http.createServer((req, res) => {
  let urlPath;
  let wantsV2Path = false;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    return send(res, 400, 'bad url');
  }
  if (urlPath === '/') urlPath = '/index.html';

  // ---- v2 arayuz katmani (site\ klasorunun disinda) ----
  // /v2/ sayfasinda goreli adresler /v2/... olarak gelir: oneki soy,
  // ama v2'nin kendi dosyalari (/v2/v2.css, /v2/v2-boot.js) ayri tutulur.
  if (urlPath === '/v2' || urlPath === '/v2/') {
    urlPath = '/index.html';
    wantsV2Path = true;
  } else if (urlPath.indexOf('/v2/') === 0) {
    const ic = urlPath.slice(3) || '/index.html';
    if (/^\/(v2\.css|v2-boot\.js)$/.test(ic)) {
      return serveFile(req, res, path.join(V2DIR, ic.slice(1)), urlPath);
    }
    urlPath = ic;
  }
  if (urlPath === '/pack.v2.css') {
    const body = packCssV2();
    if (!body) return send(res, 500, 'pack.css okunamadi');
    served++;
    const b = Buffer.from(body, 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/css; charset=utf-8',
      'Content-Length': b.length,
      'Cache-Control': 'no-cache',
    });
    return res.end(b);
  }

  // index.html istendiginde tema modunu belirle ve katmani enjekte et
  if (urlPath === '/index.html') {
    const q = new URL(req.url, 'http://localhost').searchParams;
    // KURAL (tahmin edilebilir olsun):  / = orijinal v1   |   /v2/ = v2
    // tek seferlik istisnalar: ?v2=1 zorlar, ?v1=1 zorlar
    let mode = wantsV2Path ? 'v2' : 'v1';
    if (q.get('v2') !== null && q.get('v2') !== '0' && q.get('v2') !== 'off') mode = 'v2';
    if (q.get('v1') !== null) mode = 'v1';
    // ?noInject=1 -> hicbir sey enjekte etme (karsilastirma/test icin saf orijinal)
    if (q.get('noInject') !== null) return serveIndex(req, res, 'saf');
    return serveIndex(req, res, mode);
  }

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    return send(res, 403, '403 - klasor disina cikis engellendi');
  }

  // music/tracks.php canli sunucuda PHP ile calisiyordu; yerelde sunucu listeler -> muzik calisir
  if (/^\/music\/tracks\.php$/.test(urlPath)) {
    let list = [];
    try {
      list = fs.readdirSync(path.join(ROOT, 'music'))
        .filter(f => /\.(mp3|ogg|wav|m4a)$/i.test(f))
        .map(f => ({ title: f.replace(/\.[a-z0-9]+$/i, ''), src: 'music/' + encodeURIComponent(f) }));
    } catch (e) {}
    return send(res, 200, JSON.stringify(list), { 'Content-Type': 'application/json; charset=utf-8' });
  }
  // /music/ ve /assets/ dizin listesi (sitenin taramasi icin) + basit gezinme sayfasi
  {
    const dir = path.normalize(path.join(ROOT, urlPath));
    if ((urlPath === '/music/' || urlPath === '/assets/' || urlPath === '/wrap/') && dir.startsWith(ROOT)) {
      try {
        if (fs.statSync(dir).isDirectory()) {
          const fl = fs.readdirSync(dir).filter(f => /\.(mp3|ogg|wav|m4a|jpg|jpeg|png|webp|gif)$/i.test(f));
          const links = fl.map(f => `<a href="${encodeURIComponent(f)}">${f.replace(/</g, '&lt;')}</a>`).join('<br>');
          return send(res, 200, `<!doctype html><meta charset="utf-8"><title>${urlPath}</title><body style="font:14px monospace;padding:20px;background:#0b1220;color:#cfe"><h3>${urlPath} (${fl.length} dosya)</h3>${links}</body>`);
        }
      } catch (e) {}
    }
  }

  if (urlPath === '/_local-status') {
    return send(res, 200, JSON.stringify({
      ok: true, root: ROOT, served, missing: [...missingList.keys()], uptimeSec: Math.round((Date.now() - START) / 1000),
    }, null, 2), { 'Content-Type': 'application/json; charset=utf-8' });
  }

  fs.stat(filePath, (err, st) => {
    if (!err && st.isDirectory()) return serveFile(req, res, path.join(filePath, 'index.html'), urlPath + '/index.html');
    if (err) {
      // uzantisiz isteklerde index.html dene (ornek: /hangar)
      if (!path.extname(filePath)) return serveFile(req, res, path.join(ROOT, 'index.html'), '/index.html');
      return serveFile(req, res, filePath, urlPath);
    }
    serveFile(req, res, filePath, urlPath);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('\n[X] Port ' + PORT + ' doluymus. Baska portla dene:  node server.js 8080\n');
    process.exit(1);
  }
  console.log('[X] Sunucu hatasi:', e.message);
  process.exit(1);
});

async function fillMissing() {
  const files = ['index.html', 'pack.js', 'cards.js', 'card.js', 'i18n.js', 'music.js', 'pack.css', 'style.css'];
  const refs = new Set();
  const re = /["'`(]((?:assets|music|wrap)\/[^"'`\n\r]{1,240}?\.(?:jpg|jpeg|png|webp|gif|ico|svg|mp3|ogg|wav|m4a))/gi;
  for (const f of files) {
    let t = '';
    try { t = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { continue; }
    let m; while ((m = re.exec(t))) refs.add(m[1]);
  }
  const list = [...refs].map((p) => { p = p.split('?')[0].split('#')[0].trim(); try { p = decodeURIComponent(p); } catch (e) {} return p; })
    .filter(p => !fs.existsSync(path.join(ROOT, p)));
  console.log(`\n[tamamla] ${refs.size} gorsel/ses referansi tarandi, ${list.length} eksik.\n`);
  let i = 0, ok = 0, bad = 0;
  async function worker() {
    while (i < list.length) {
      const p = list[i++];
      const buf = await fetchLive(p);
      if (buf) {
        const dest = path.join(ROOT, p);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, buf);
        ok++; console.log(`  [${ok + bad}/${list.length}] OK   ${p} (${Math.round(buf.length / 1024)} KB)`);
      } else { bad++; console.log(`  [${ok + bad}/${list.length}] YOK  ${p}`); }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker(), worker(), worker()]);
  console.log(`\n[tamamla] bitti: ${ok} indirildi, ${bad} bulunamadi (404). Sunucuyu Ctrl+C ile kapat.\n`);
}
if (args.includes('--fill')) {
  fillMissing();
} else {
  server.listen(PORT, HOST, () => {
  const hasIndex = fs.existsSync(path.join(ROOT, 'index.html'));
  console.log('\n============================================');
  console.log('  SC-TCG YEREL SUNUCU  calisiyor');
  console.log('--------------------------------------------');
  console.log('  ACILACAK ADRES : http://localhost:' + PORT + '/' + (DEV ? '?dev=1' : ''));
  console.log('  DOSYA KOKU     : ' + ROOT);
  if (FLAG_LAN) for (const ip of localIps()) console.log('  TELEFON/AG     : http://' + ip + ':' + PORT + '/');
  console.log('  KAPATMAK ICIN  : Ctrl + C   (veya baslat.bat penceresini kapat)');
  console.log('  404 olan dosyalar asagida tek tek yazilir (eksik gorsel/ses).');
  console.log('============================================');
  if (!hasIndex) console.log('\n[X] UYARI: site/index.html bulunamadi! "site" klasoru bu .js ile ayni yerde olmali.\n');
  try {
    const n = (function count(d) {
      let c = 0;
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        if (f.isDirectory()) c += count(path.join(d, f.name)); else c++;
      }
      return c;
    })(ROOT);
    console.log(`  (site klasorunde ${n} dosya bulundu)\n`);
  } catch (e) {}
  });
}

process.on('SIGINT', () => { console.log('\nSunucu kapatildi.'); process.exit(0); });

/* =========================================================
   v2 Tema motoru: pack.css'in BELLEK-ICI donusumu
   Orijinal site\pack.css dosyasina HIC dokunulmaz. v2 modunda
   sunucu ayni dosyayi "UI cyan -> amber" cevirmis haliyle servis eder.
   Kart/nadirlik gorselleri (rarity, foil, gem, booster, artwork...)
   KORUNUR -> oyunun kart kimligi degismez, sadece kabuk (UI) amber olur.
   ========================================================= */
/* Kart ve booster GORSELLERININ renkleri korunur (oyunun kart kimligi).
   Kural: bir CSS kuralinda stil VERILEN ogе selectorun SON parcasidir.
   Orn: ".bstore-card:hover .booster-body" -> stillenen .booster-body (korunur)
        ".bstore-card"                      -> stillenen kendisi (UI -> amber olur) */
const KARD_KORU = /^(rarity-|card-3d$|card-wrapper$|face$|front$|back$|back-|artwork$|flavor$|footer$|header$|title$|badge$|gem$|shine$|glare$|stats$|maker$|seal|quers-|q-letter|q-core|role-tag|rlabel$|is-captain$|is-yield$|fuel-badge$|fuel-icon$|fuel-unit$|fuel-val$|fullart-badge$|wreck-warning-band$|booster-|crimp-|emblem-|foil-|tear-|pack-open|pack-slot|slab-|slab$)/i;

function stillenenOge(sel) {
  const son = (sel.split(',').pop() || '');
  const oge = (son.trim().split(/[\s>+~]+/).pop() || '').replace(/::?[a-z-]+(\([^)]*\))?$/i, '');
  return oge.replace(/^[.#]/, '');
}

// rgba(r,g,b,a) ya da #hex -> amber karsiligi (alfa/açiklik korunur)
const HEX_MAP = {
  '#00e5ff': '#ffb020', '#00f2fe': '#ffcf5c', '#3ea8ff': '#e59a2a',
  '#8cf3ff': '#ffd98a', '#d8f8ff': '#ffeccd', '#00ffa6': '#ffca55',
  '#4cd97b': '#ffc247', '#3ddc97': '#ffc247', '#0a1826': '#141018',
};
const RGBA_MAP = [
  ['0,229,255', '255,176,32'], ['0,242,254', '255,196,70'],
  ['62,168,255', '229,154,42'], ['0,255,166', '255,202,85'],
  ['76,217,123', '255,194,71'], ['57,220,151', '255,194,71'],
];

function rgbNorm(s) { return s.replace(/\s+/g, ''); }

function recolorChunk(text) {
  let out = text;
  for (const [from, to] of RGBA_MAP) {
    out = out.replace(new RegExp('rgba\\(\\s*' + from.replace(/,/g, '\\s*,\\s*') + '\\s*,', 'gi'), 'rgba(' + to + ',');
    out = out.replace(new RegExp('rgb\\(\\s*' + from.replace(/,/g, '\\s*,\\s*') + '\\s*\\)', 'gi'), 'rgb(' + to + ')');
  }
  for (const [from, to] of Object.entries(HEX_MAP)) {
    out = out.split(from).join(to);
    const U = from.toUpperCase();
    if (U !== from) out = out.split(U).join(to.toUpperCase());
  }
  return out;
}

// kural bazli: kartla ilgili secicilerdeki renkler degistirilmez.
// @media / @supports bloklarinin ICERIGI de islenir (mobil kurallar cyan kalmasin).
function recolorPackCss(css) {
  let out = '';
  let i = 0;
  const n = css.length;
  while (i < n) {
    const open = css.indexOf('{', i);
    if (open < 0) { out += css.slice(i); break; }
    const sel = css.slice(i, open);
    let close = open + 1, depth = 1;
    while (close < n && depth > 0) {
      const c = css[close];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      close++;
    }
    const body = css.slice(open + 1, close - 1);
    const at = /^\s*@/.test(sel);
    let yeni;
    if (/^\s*@(media|supports)/.test(sel)) yeni = recolorPackCss(body);   // icerik de donusur
    else if (at) yeni = body;                                              // @keyframes vs. -> dokunma
    else yeni = KARD_KORU.test(stillenenOge(sel)) ? body : recolorChunk(body);
    out += sel + '{' + yeni + css.slice(close - 1, close);
    i = close;
  }
  return out;
}

let packV2Cache = null;
function packCssV2() {
  if (packV2Cache !== null) return packV2Cache;
  try {
    const orig = fs.readFileSync(path.join(ROOT, 'pack.css'), 'utf8');
    packV2Cache = recolorPackCss(orig);
  } catch (e) {
    packV2Cache = '';
  }
  return packV2Cache;
}
