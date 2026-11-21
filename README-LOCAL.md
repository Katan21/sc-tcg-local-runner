# SC-TCG — YEREL (LOCAL) CALISTIRMA PAKETI

Bu klasor, arkadasinin cikardigi inceleme paketindeki **site kopyasini kendi bilgisayarinda
calistirmak** icin hazirlandi. Hicbir sey kurmana gerek yok (Node paketin icinde).
Kodun hatalarina **dokunulmadi** — site oldugu gibi calistirildi.

## 1) NASIL ACARIM?

**`baslat.bat` dosyasina cift tikla.**

- Kendi kendine tarayiciyi acar -> **http://localhost:4173/**
- Siyah konsol penceresi acik kalir; sunucu o pencereyken calisir.
- Kapatmak icin: **`kapat.bat`** (veya konsol penceresini kapat / icinde `Ctrl + C`).

Baska bir sey yapmana gerek yok.

### v2 arayuzu (yeni gorunum) icin: **`baslat-v2.bat`**

- Tarayiciyi **http://localhost:4173/v2/** adresinde acar: koyu grafit zemin + amber/turuncu
  vurgu, sol menu ustte yatay "chip" menu oldu, paneller yumusak koseli.
- **Iki gorunum de ayri ayri duruyor:**
  - `baslat.bat`      -> **v1 = orijinal** (cyan, sol sidebar) — hicbir sey degismedi
  - `baslat-v2.bat`   -> **v2 = amber HUD**
- Sayfa icinde sag alttaki **"ARAYUZ"** kutusundan da tek tiklama ile
  `v1 · orijinal` / `v2 · amber hud` arasi gecis yapabilirsin.
- Kural sabit: **`/` = orijinal**, **`/v2/` = v2**. (Zorlamak icin `?v1=1` / `?v2=1`.)

> **v2 nasil calisiyor, orijinale dokundu mu?** HAYIR. `site\` klasorundeki 225 dosya
> SHA-256 ile birebir ayni kaldigi dogrulandi. v2, `v2\` klasorunde duran **ayri bir katman**:
> sunucu `index.html`'i tarayiciya gonderirken sonuna 2 satir ekliyor (tema CSS'i + tema secici)
> ve `pack.css` yerine bellekte "UI cyan -> amber" cevirmis hâlini (`/pack.v2.css`) servis ediyor.
> Kart gorselleri, nadirlik renkleri (yesil/mavi/mor/eFSANE), foil ve booster sanatina
> **dokunulmadi** — oyunun kart kimligi aynen korundu.
> Denetlemek istersen: `durum.bat` (hepsi ayni yazar) veya `http://localhost:4173/_local-status`.
> Karsilastirma icin saf orijinal: **`http://localhost:4173/?noInject=1`** (hicbir sey enjekte edilmez).

## 2) KLASOR YAPISI

```
SC-TCG-site\
  baslat.bat              <- TEK TIKLAMAYLA AC — v1 ORIJINAL (bunu kullan)
  baslat-v2.bat           <- v2 ARAYUZ (amber HUD) ile acir: /v2/
  kapat.bat               <- sunucuyu kapatir (sadece bu klasordeki node'u oldurur)
  baslat-telefon.bat      <- ayni Wi-Fi'daki telefondan da acmak icin
  durum.bat               <- eksik gorsel/ses + SHA-256 butunluk raporu (salt okunur)
  eksikleri-tamamla.bat   <- eksikleri canli siteden indirir (internet gerekir)
  server.js               <- yerel sunucu (tek dosya, harici paket yok)
  durum.js                <- durum raporunun kodu
  kapat.ps1               <- kapat.bat'in icinde calisan betik
  v2\                     <- v2 ARAYUZ KATMANI (orijinale dokunmaz)
    v2.css                  <- tema stilleri (amber HUD, ust menu, paneller)
    v2-boot.js              <- tema secici + html.v2 isareti (sag alttaki kutu)
  site\                   <- SITENIN KOPYASI (225 dosya, 305 MB) — DOKUNULMADI
    index.html  pack.js  pack.css  cards.js  card.js  i18n.js  style.css
    supabase-config.js  music.js  manifest.json  favicon.png/.ico  supabase_setup.sql
    assets\ (205 gorsel)   music\ (2 mp3)   wrap\ (3 ses)
    _manifest.csv          <- arkadasinin cikardigi HTTP kodu + boyut + SHA-256 listesi
  _tools\node-win-x64\    <- tasiyor Node v26 — sisteme kurulu degil, sadece burada
  README-LOCAL.md         <- bu dosya
```

**Siteyi degistirmek istersen:** `site\` klasorunun icini duzenle
(ornegin `site\pack.js`, `site\index.html`). Sunucu her istekte dosyayi diskten okur:
**dosyayi kaydet -> tarayiciyi yenile** yeter, sunucuyu yeniden baslatmana gerek yok.
Tarayici eski JS'i onbellekte tutarsa `Ctrl + F5`.

## 3) VERILER NEREDE? (BU KISMI OKU)

Bu sunucu sadece dosyalari servis eder; **oyunun verisi sitede gomulu duran Supabase
projesine gider** (`site\supabase-config.js` icinde URL + public key yazili — bunlar
zaten herkese acik anahtarlar, ama yine de bilmen gereken su):

Yerel kopyada oynarken su tablolara yazma/okuma yapiliyor (pack.js'te sayildi):
`player_profiles`, `market_listings`, `comm_array_messages`, `feedback`, `qsa_submissions`,
`qsa_auctions`, `limited_pack_stock`, `pvp_matches` + `buy_market_listing`,
`claim_youtube_subscribe_bonus`, `place_qsa_bid` gibi RPC'ler.

Yani **burada yaptigin islemler canli veritabanina gider** (aUEC harcamak, kart acmak,
market'e satis koymak, sohbete yazmak gibi) ve diger oyuncularin gordugu seyleri degistirebilir.
Arkadasinin raporu da zaten bunu "hileye acik" diye isaret ediyor (BULGU D/E).

Sakin test etmek istersen:
- `site\supabase-config.js` icinde `SUPABASE_URL` ve `SUPABASE_ANON_KEY` degerlerini `''` yap
  -> kod `isSupabaseConfigured()` false donuyor, bulut islemleri devre disi kaliyor,
  oyun **localStorage** ile calismaya devam ediyor (ilerleme sadece senin tarayicinda).
- Geri almak icin o iki alani eski degerlerine dondur.
- Ilerlemeyi tamamen sifirlamak istersen: tarayicida F12 -> Application -> Local Storage ->
  `http://localhost:4173` satirini sil.

**ONEMLI NOT — `localhost` = otomatik dev modu:** `pack.js:375` `isLocalDevEnvironment()`
fonksiyonu host `localhost` oldugu icin **true** donuyor. Bu yuzden yerelde giris yapmadan
`isPlayerAuthorized()` true oluyor, sol menudeki **"Dev Showroom"** sekmesi ve test-pack
butonlari gorunuyor (pack.js'te 22 yerde kullaniliyor). Bunlara basarsan istekler **canli
Supabase'e gider** — arkadasinin raporu admin RPC'lerinin sunucu tarafinda kilitli oldugunu,
yani reddedilecegini soyluyor ("dogrulanip temiz cikanlar"), ama yine de bosuna basma.
Rapor BULGU D'nin one cikardigi "istemci taraflı hile" kapiari da burada acik olur;
o yuzden yerel kopyayi "paralari bozmayayim" diye test alani gibi kullanma,
canli veriye yazdiginı bilerek kullan.

**Google Login'i kullanma:** `localhost` Google Cloud konsolunda yetkili kaynak degil
(sitenin kaydi `https://sc-tcg.gamer.free` uzerine), hata verir; gerek de yok.

## 4) v2 ARAYUZU — DETAY / SORUN GIDERME

| istedigin | nasil |
|---|---|
| v1'e don | `baslat.bat` veya sag alttaki kutudan **v1 · orijinal** |
| v2'ye gec | `baslat-v2.bat`, `http://localhost:4173/v2/`, veya kutudan **v2 · amber hud** |
| saf orijinali gormek (benim ekledigim dahil hicbir sey olmadan) | `http://localhost:4173/?noInject=1` |
| beyaz sekme (FOUC) olursa | `Ctrl + F5` (tema CSS'i bilerek en sona ekleniyor) |
| bir renk/kutu v2'de tuhaf | `v2\v2.css` icinde ara ve duzenle -> tarayiciyi yenile |

**v2'de degistirilenler (yalnizca kabuk):** zemin, ust bar, menu (sol sidebar -> ustte yatay
chip menu), panellerin koseleri/bosluklari, buton ve form alanlari, kaydirma cubugu,
yazilari (Chakra Petch / Barlow Condensed), UI'daki cyan/yesil vurgular -> amber.

**v2'de KORUNANlar:** kart on/arka yuzu, nadirlik renkleri (`--rarity-*` `style.css`'te duruyor,
o dosyaya hic dokunulmadi), foil/parlama, gem, booster kutusu sanati, tear/yanipesanimasyonlari,
tum ikon ve gorseller. Sunucu `pack.css` cevrimini yaparken bu sinifi bulan kurallari atliyor
(olcum: ~485 UI kurali donusturuldu, kart/booster'a ait ~26 kural oldugu gibi birakildi).

**Oyun koduna dokunulmadi:** `pack.js`, `cards.js`, `card.js`, `i18n.js`, `index.html`,
`supabase-config.js` ve gorseller/sesler AYNEN duruyor (SHA-256 ile dogrulandi).
Yani v2 bir "tema"; bozulsan bile oyunu kaybetmezsin — `baslat.bat` her zaman orijinali acar.

## 5) OLDUGU BIRAKILAN HATALAR (düzeltmemi istemediginler)

Raporlardaki hatalara dokunulmadi. Yerelde de gorunenler:

| Ne gorunuyor | Nedeni |
|---|---|
| Konsolda kirmizi "JAVASCRIPT LAUFZEITFEHLER" bandi | `pack.js:5980` -> `ReferenceError: Cannot access 'qsaLeaderboardData' before initialization`. `let qsaLeaderboardData` satiri 5744'te, ama ilk `updateAllUI()` cagrisi 4345'te geliyor (TDZ). Sitenin kendi hata bandi; oyunu durdurmuyor |
| QSA rozetinde sira "RANG #--" kalabilir | Ayni hatanin sonucu (QSA sivasi yuklenemiyor) |
| Ustte sari "ENTWICKLUNGVERSION / Strg+F5" uyarisi | Sitenin kendi uyarisi (`?v=` cache sorunu, rapor C) |
| `assets/nomad.jpg` 404 | dosya **canli sunucuda da yok** (rapor BULGU A). Nyx/Nomad kartinin arka planı bos |
| `assets/stanton-logo.png` 404 | canli sunucuda da yok. Yuzukarti/fallback gorsel bos |
| `wrap/A Crips.mp3` 404 | canli sunucuda da yok. Pack acilis seslerinden biri sessiz |
| Muzik calmayabilir | `music/tracks.php` PHP dosyasi, Node'da calismaz. **Sunucuda bunu ben ele aldım**: klasoru kendisi tarayip ayni JSON'u donuyor (test edildi: 2 sarki donuyor, mp3 200/206 ile akıyor). Sesin cikmasi icin sol alttaki play tuguna basin (tarayicilar tik olmadan ses baslatmaz). **Sesin gercekten ciktigini senin PC'nde kulakla dogrulayamadim** — sunucu tarafini test ettim |

Not: 404 olan her dosya `baslat.bat` konsoluna ve `_sunucu.log`'a yazilir.
Hepsini gormek icin: **http://localhost:4173/_local-status**

## 6) DURUM RAPORU (durum.bat)

`durum.bat` cift tikla -> sunucu ile ugrasmadan sunlari gosterir (benim ciktisim):

```
dosya (diskte)    : 225  (305.5 MB)
gorsel/ses ref    : 211
eksik ref         : 3   <- assets/nomad.jpg, assets/stanton-logo.png, wrap/A Crips.mp3
SHA-256 dogrulanan: 219 dosya (hepsi ayni - kopya saglam)
```

Yani arkadasinin indirdigi kopya ile senin kopyan birebir ayni; eksik 3 dosya da
canli sunucuda olmayan dosyalar.

## 7) PARAMETRELER (istesek)

```
node server.js 4173          -> normal
node server.js 8080          -> baska port (4173 doluysa)
node server.js 4173 --lan    -> ayni Wi-Fi'daki telefon/tablet de acabilir (konsolda IP yazar)
node server.js 4173 --online -> eksik bir dosya istenirse canli siteden cekip site\ icine kaydeder
node server.js --fill        -> eksikleri basta bir kere indirir (internet gerekir)
```

`--online` / `--fill` modlari **canli siteye yazmaz, sadece okur**; indirdigini kendi
`site\` klasorune kaydeder.

## 8) RAPORLAR NEREDE?

Raporlar kardes klasorde duruyor: `..\SC-TCG-inceleme\rapor\`
- `REPORT-EN.md` -> gruba/atilacak Ingilizce tam rapor
- `BULGULAR.md`  -> guvenlik bulgulari (TR)
- `BUG-RAPORU.md` -> islevsel/kalite hatalari
- `kanit-dom-karsilastirma.txt`, `audit-*.txt` -> kanit ciktilari
Araclar: `..\SC-TCG-inceleme\tools\` (audit.js, mirror.js, rpc_guard.sh ...)
