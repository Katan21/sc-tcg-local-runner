/* =========================================================
   SC-TCG · v2 BOOT (hem v1 hem v2 modunda yuklenir)
   Sunucu bu dosyayi HTML'in <head> kismina ekler.
   - html class'ini (v2 / v1) hemen koyar -> renk sekmesi yanip sonradan duzelmez
   - sag alttaki v1/v2 secicisini kurar (secici kendi stilini kendisi basar,
     boylece v1 modunda da (v2.css yuklu degilken) dogru gorunur)
   Orijinal dosyalara dokunmaz.
   ========================================================= */
(function () {
  'use strict';
  var KEY = '***';
  var MODE = (window.__SC_V2_MODE === 'v2' || window.__SC_V2_MODE === 1 || window.__SC_V2_MODE === '1') ? 'v2' : 'v1';
  var SOFT = MODE === 'v2';

  function setClass() {
    var el = document.documentElement;
    if (MODE === 'v2') { el.classList.add('v2'); el.setAttribute('data-ui', 'v2'); }
    else { el.classList.remove('v2'); el.setAttribute('data-ui', 'v1'); }
  }
  setClass();

  var CSS = [
    '#v2Switch{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;align-items:center;gap:6px;',
    'padding:7px 8px 7px 12px;border-radius:999px;background:rgba(9,12,17,.93);border:1px solid rgba(255,176,32,.24);',
    'box-shadow:0 10px 30px rgba(0,0,0,.55);backdrop-filter:blur(12px);font-family:"Chakra Petch","Rajdhani",sans-serif;}',
    '#v2Switch .v2-sw-label{font-size:9.5px;letter-spacing:.22em;color:#a8761d;font-weight:700;margin-right:2px;}',
    '#v2Switch .v2-sw-btn{padding:6px 11px;border-radius:999px;cursor:pointer;font-size:10.5px;font-weight:700;',
    'letter-spacing:.08em;border:1px solid transparent;background:rgba(255,255,255,.05);color:#93a1b3;font-family:inherit;}',
    '#v2Switch .v2-sw-btn:hover{color:#fff;background:rgba(255,176,32,.14);}',
    '#v2Switch .v2-sw-btn.is-on{background:linear-gradient(135deg,#ffd166,#ffb020);color:#0a0d12;border-color:#ffd166;',
    'box-shadow:0 4px 14px rgba(255,176,32,.35);}',
    '#v2Switch .v2-sw-x{width:22px;height:22px;border-radius:50%;cursor:pointer;border:1px solid rgba(147,161,179,.25);',
    'background:none;color:#93a1b3;font-size:14px;line-height:1;padding:0;}',
    '#v2Switch .v2-sw-x:hover{color:#fff;border-color:#ffb020;}',
    '#v2Switch.v2-sw-min .v2-sw-label,#v2Switch.v2-sw-min .v2-sw-btn{display:none;}'
  ].join('');

  function build() {
    if (document.getElementById('v2Switch') || !document.body) return;
    var st = document.createElement('style');
    st.id = 'v2SwitchStyle';
    st.textContent = CSS;
    document.head.appendChild(st);

    var box = document.createElement('div');
    box.id = 'v2Switch';
    box.innerHTML =
      '<span class="v2-sw-label">ARAYUZ</span>' +
      '<button type="button" class="v2-sw-btn' + (MODE === 'v1' ? ' is-on' : '') + '" data-go="v1">v1 · orijinal</button>' +
      '<button type="button" class="v2-sw-btn' + (MODE === 'v2' ? ' is-on' : '') + '" data-go="v2">v2 · amber hud</button>' +
      '<button type="button" class="v2-sw-x" title="kucult" aria-label="kucult">&times;</button>';
    document.body.appendChild(box);

    box.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var b = t.closest('[data-go],.v2-sw-x');
      if (!b) return;
      if (b.classList.contains('v2-sw-x')) { box.classList.toggle('v2-sw-min'); return; }
      var go = b.getAttribute('data-go');
      if (go === 'v2') location.href = '/v2/';
      else location.href = '/';
    });
  }

  /* kartlarda hafif parlama: pack.js kartlara transform (tilt) uyguluyor,
     o yuzden transform ile yarismamak icin filter/opacity kullanildi */
  function softHover() {
    if (!SOFT || document.getElementById('v2SoftHover')) return;
    var st = document.createElement('style');
    st.id = 'v2SoftHover';
    st.textContent = '.card-wrapper{transition:filter .2s ease,opacity .2s ease;}' +
      '.card-wrapper:hover{filter:brightness(1.12) saturate(1.08);opacity:.97;}';
    document.head.appendChild(st);
  }

  function start() { build(); softHover(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
