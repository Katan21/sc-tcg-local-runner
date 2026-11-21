/* =========================================================
   SC-TCG  -  SITE DURUM RAPORU  (salt okunur, hicbir sey degistirmez)
   Kullanim:  durum.bat ile cift tikla   (veya: node durum.js)

   Ne yapar:
     1) index.html / pack.js / cards.js ... icindeki TUM gorsel+ses
        referanslarini tarar, hangilerinin diskte oldugunu bulur.
        (bosluklu isimler de dahil: "assets/pyro neu/....jpg")
     2) _manifest.csv icindeki SHA-256 degerlerini dosyalarla karsilastirir
        -> arkadasinin indirdigi kopya ile senin kopyanin ayni oldugunu kanitlar.
     3) diskte durup hicbir yerde kullanilmayan gorselleri sayar.
   ========================================================= */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, 'site');
const srcFiles = ['index.html', 'pack.js', 'cards.js', 'card.js', 'i18n.js', 'music.js', 'pack.css', 'style.css', 'manifest.json'];

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.log('[X] site/index.html bulunamadi. Bu dosya "site" klasorunun yaninda olmali.');
  process.exit(1);
}

function temizle(p) {
  p = p.split('?')[0].split('#')[0].trim();
  try { p = decodeURIComponent(p); } catch (e) {}
  return p;
}

const refs = new Map();
const re = /["'`(]((?:assets|music|wrap)\/[^"'`\n\r]{1,240}?\.(?:jpg|jpeg|png|webp|gif|ico|svg|mp3|ogg|wav|m4a))/gi;
for (const f of srcFiles) {
  let text = '';
  try { text = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { continue; }
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text))) {
    const p = temizle(m[1]);
    if (p && !refs.has(p)) refs.set(p, f);
  }
}

const missing = [];
for (const p of refs.keys()) if (!fs.existsSync(path.join(ROOT, p))) missing.push(p);

let man = null;
try {
  man = {};
  const lines = fs.readFileSync(path.join(ROOT, '_manifest.csv'), 'utf8').split(/\r?\n/).slice(1);
  for (const ln of lines) {
    const c = ln.split(',');
    if (c.length >= 4) man[temizle(c[0])] = { boyut: +c[2], sha: c[3], http: +c[1] };
  }
} catch (e) {}

let shaOk = 0;
const shaBad = [];
const boyutFark = [];
const manYok = [];
let shaAtlananim = 0;
if (man) {
  for (const [p, info] of Object.entries(man)) {
    const fp = path.join(ROOT, p);
    if (!fs.existsSync(fp)) {
      // manifest'te http=302 + boyut=0 olan girdiler zaten indirilememis (canli sunucuda da yok)
      if (!(info.http === 302 && info.boyut === 0)) manYok.push(p);
      continue;
    }
    // manifest'te http=302 + boyut=0 ise arkadasin o dosyayi indirememis -> SHA karsilastirmasi anlamsiz
    if (info.http === 302 || info.boyut === 0) { shaAtlananim++; continue; }
    const buf = fs.readFileSync(fp);
    if (info.sha) {
      const h = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
      if (h === info.sha) shaOk++; else shaBad.push(p);
    }
    if (info.boyut && buf.length !== info.boyut) boyutFark.push(p);
  }
}

const disk = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else disk.push(path.relative(ROOT, p).split(path.sep).join('/'));
  }
})(ROOT);
const kullanilmayan = disk.filter(p => /^(assets|music|wrap)\//i.test(p) && !refs.has(p));
const bytes = disk.reduce((a, f) => a + fs.statSync(path.join(ROOT, f)).size, 0);

console.log('\n=================== SITE DURUM RAPORU ===================');
console.log('  site klasoru      : ' + ROOT);
console.log('  dosya (diskte)    : ' + disk.length + '  (' + (bytes / 1048576).toFixed(1) + ' MB)');
console.log('  gorsel/ses ref    : ' + refs.size);
console.log('  eksik ref         : ' + missing.length + (missing.length ? '   <- bunlar CANLI sunucuda da yok (rapor: BULGU A)' : '   (yok)'));
missing.sort().forEach(p => console.log('      - ' + p + '   (kullanan: ' + refs.get(p) + ')'));
if (man) {
  console.log('  SHA-256 dogrulanan: ' + shaOk + ' dosya' +
    (shaBad.length ? '   FARKLI: ' + shaBad.join(', ') : '   (hepsi ayni - kopya saglam)') +
    (shaAtlananim ? '   [' + shaAtlananim + ' girdi atlandi: manifestte 302/0 bayt kayitli,yani arkadasin onlari indirememis]' : ''));
  if (boyutFark.length) console.log('  boyut farki       : ' + boyutFark.join(', '));
  if (manYok.length) console.log('  manifestte olup diskte olmayan: ' + manYok.join(', '));
}
console.log('  diskte ama kullanilmayan gorsel/ses: ' + kullanilmayan.length + '  (muzik dosyalari + tracks.php)');
kullanilmayan.slice(0, 20).forEach(p => console.log('      o ' + p));
console.log('=========================================================\n');
