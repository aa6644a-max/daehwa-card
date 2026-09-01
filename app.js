/* 대화카드 — 관상용 화면
 * 흰 화면이 균일하게 어두워졌다 밝아지는 것을 무한 반복한다.
 * 상단 '대화카드' 문구를 1초간 길게 누르면 숨김 설정 패널이 열린다.
 */
(function () {
  'use strict';

  /* 기본값을 바꿀 때는 이 버전을 올린다.
     안 올리면 예전에 접속해 값을 만졌던 기기는 저장된 옛 값을 계속 써서
     QR 로 들어온 사람마다 다른 주기를 보게 된다. */
  var STORE_KEY = 'daehwa-card.breathe.v3';

  var DEFAULTS = {
    wave: 'breathe',  // 'breathe' | 'heart'
    period: 1,        // 초 — QR 로 들어온 모든 사람이 같은 1초 주기를 보게 고정
    depth: 15,        // % (15 = 밝기 100% ↔ 85%)
    ease: 'ease-in-out',
    guideW: 100,      // % — #stage 가로 기준. 실측 카드로 맞춘 값
    guideH: 123       // % — #stage 세로 기준. 실측 카드로 맞춘 값
  };
  var GUIDE_W_MIN = 60, GUIDE_W_MAX = 110;
  var GUIDE_H_MIN = 70, GUIDE_H_MAX = 130;

  /* 주기 하한 — 광과민성 발작 기준(WCAG 2.3.1, 초당 3회) 때문에 파형별로 다르다.
     어둡기 15% 만 되어도 상대휘도가 1.0 → 0.69 로 떨어져 '번쩍임' 임계에 해당하므로
     초당 3회를 넘길 수 없다. 호흡은 한 주기에 1회, 심장박동은 2회 번쩍인다. */
  var MIN_PERIOD = { breathe: 0.5, heart: 0.7 };
  var MAX_PERIOD = 12;

  function minPeriod(wave) {
    return MIN_PERIOD[wave] || MIN_PERIOD.breathe;
  }

  var root = document.documentElement;
  var body = document.body;

  /* ── 다국어 ────────────────────────────────────────────────
     QR 로 들어온 사람이 언어를 고르면 배너 이미지와 안내 문구가 그 언어로 바뀐다.
     설정 패널은 운영자용이라 한국어로 둔다. */
  var LANGS = ['ko', 'en', 'ja', 'zh'];

  /* html[lang] 에 넣을 값. 같은 한자도 lang 에 따라 자형이 달라진다. */
  var HTML_LANG = { ko: 'ko', en: 'en', ja: 'ja', zh: 'zh-Hans' };

  var I18N = {
    ko: {
      ok: '확인',
      fs_standalone: '이 기기는 웹에서 상단 상태바를 숨길 수 없습니다. 지금이 최대 화면입니다.',
      fs_ios_other: '아이폰은 모든 브라우저가 Safari 엔진을 써서 전체화면이 안 됩니다. Safari 로 열어 공유 → “홈 화면에 추가” 하시면 주소창이 사라집니다.',
      fs_ios: '아이폰은 웹 전체화면 기능이 없습니다. 공유 버튼 → “홈 화면에 추가” 하시면 주소창이 사라집니다.',
      fs_other: '이 브라우저는 웹 전체화면 기능이 없습니다. 홈 화면에 추가하시면 주소창이 사라집니다.',
      sleep: '이 기기에서는 화면 꺼짐을 자동으로 막을 수 없습니다. 설정 > 디스플레이 > 자동 잠금을 ‘안 함’으로 바꿔주세요.'
    },
    en: {
      ok: 'OK',
      fs_standalone: 'This device cannot hide the status bar from a web page. This is as large as it gets.',
      fs_ios_other: 'On iPhone every browser uses the Safari engine, so full screen is unavailable. Open in Safari, then Share → “Add to Home Screen” to remove the address bar.',
      fs_ios: 'iPhone does not support full screen for web pages. Tap Share → “Add to Home Screen” to remove the address bar.',
      fs_other: 'This browser does not support full screen. Add this page to your home screen to remove the address bar.',
      sleep: 'This device cannot keep the screen awake automatically. Please set Settings > Display > Auto-Lock to Never.'
    },
    ja: {
      ok: 'OK',
      fs_standalone: 'この端末ではウェブページから上部のステータスバーを隠せません。これが最大表示です。',
      fs_ios_other: 'iPhone はすべてのブラウザが Safari エンジンのため全画面にできません。Safari で開いて共有 →「ホーム画面に追加」するとアドレスバーが消えます。',
      fs_ios: 'iPhone はウェブページの全画面表示に対応していません。共有ボタン →「ホーム画面に追加」でアドレスバーが消えます。',
      fs_other: 'このブラウザは全画面表示に対応していません。ホーム画面に追加するとアドレスバーが消えます。',
      sleep: 'この端末では画面の自動消灯を止められません。設定 > 画面表示と明るさ > 自動ロックを「なし」にしてください。'
    },
    zh: {
      ok: '确定',
      fs_standalone: '此设备无法从网页隐藏顶部状态栏，目前已是最大画面。',
      fs_ios_other: 'iPhone 上所有浏览器都使用 Safari 引擎，因此无法全屏。请用 Safari 打开，再点分享 →「添加到主屏幕」即可隐藏网址栏。',
      fs_ios: 'iPhone 不支持网页全屏。点击分享 →「添加到主屏幕」即可隐藏网址栏。',
      fs_other: '此浏览器不支持全屏。添加到主屏幕即可隐藏网址栏。',
      sleep: '此设备无法自动防止息屏。请将「设置 > 显示与亮度 > 自动锁定」设为「永不」。'
    }
  };

  var lang = 'ko';                       // 선택 전 기본값
  function t(key) { return (I18N[lang] || I18N.ko)[key]; }

  /* ── 설정 저장/복원 ─────────────────────────────────────── */

  function clamp(n, min, max, fallback) {
    if (typeof n !== 'number' || !isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var saved = JSON.parse(raw);
      var wave = saved.wave === 'heart' ? 'heart' : DEFAULTS.wave;
      return {
        wave: wave,
        period: clamp(Number(saved.period), minPeriod(wave), MAX_PERIOD, DEFAULTS.period),
        depth: clamp(Number(saved.depth), 0, 40, DEFAULTS.depth),
        ease: typeof saved.ease === 'string' ? saved.ease : DEFAULTS.ease,
        guideW: clamp(Number(saved.guideW), GUIDE_W_MIN, GUIDE_W_MAX, DEFAULTS.guideW),
        guideH: clamp(Number(saved.guideH), GUIDE_H_MIN, GUIDE_H_MAX, DEFAULTS.guideH)
      };
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  var state = load();

  /* URL 파라미터로도 덮어쓸 수 있게 (?period=6&depth=22) — 튜닝용 */
  (function applyQuery() {
    var q = new URLSearchParams(location.search);
    if (q.get('wave') === 'heart' || q.get('wave') === 'breathe') state.wave = q.get('wave');
    if (q.has('period')) state.period = clamp(parseFloat(q.get('period')), minPeriod(state.wave), MAX_PERIOD, state.period);
    if (q.has('depth')) state.depth = clamp(parseFloat(q.get('depth')), 0, 40, state.depth);
    if (q.has('ease')) state.ease = q.get('ease');
    if (q.has('guideW')) state.guideW = clamp(parseFloat(q.get('guideW')), GUIDE_W_MIN, GUIDE_W_MAX, state.guideW);
    if (q.has('guideH')) state.guideH = clamp(parseFloat(q.get('guideH')), GUIDE_H_MIN, GUIDE_H_MAX, state.guideH);
  })();

  function apply() {
    /* 파형을 바꾸면 하한이 달라지므로 주기를 다시 가둔다 */
    state.period = clamp(state.period, minPeriod(state.wave), MAX_PERIOD, DEFAULTS.period);

    root.style.setProperty('--period', state.period + 's');
    root.style.setProperty('--dim-max', (state.depth / 100).toFixed(3));
    root.style.setProperty('--ease', state.ease);
    root.style.setProperty('--guide-w', state.guideW + '%');
    root.style.setProperty('--guide-h', state.guideH + '%');
    body.classList.toggle('wave-heart', state.wave === 'heart');
    measureArtOverlap();   // 가이드 크기가 바뀔 때마다 침범량도 다시 잰다
  }

  /* ── 카드 가이드가 문구 바를 침범하는 만큼 여백으로 돌리기 ──────
     카드 가이드(--guide-w/--guide-h)는 고정값이라 손대지 않는다. 대신 문구 바 안에서
     "이미지 높이 + 여백" 의 합이 항상 --art-max-h 로 유지되게 하여(styles.css 참고)
     stage/카드 절대 크기는 그대로 두면서, 침범이 일어나는 만큼만 글자 없는 빈 자리로
     비켜준다. 여백 크기는 기기·언어·화면비마다 다르므로 매번 실측한다. */
  function measureArtOverlap() {
    var stage = document.getElementById('stage');
    var guide = document.getElementById('card-guide');
    if (!stage || !guide) return;
    var SAFETY = 4;   // px — 서브픽셀 반올림 오차로 경계선이 글자에 닿지 않도록

    /* 이전에 넣은 여백이 이번 측정에 섞이지 않도록, 실측 전에 0으로 되돌린다.
       (여백을 넣어도 바 전체 칸 높이는 안 바뀌므로 stage 크기는 그대로지만,
       혹시 모를 오차 누적을 막기 위해 매번 0 기준으로 다시 잰다.) */
    root.style.setProperty('--art-buffer-top', '0px');
    root.style.setProperty('--art-buffer-bottom', '0px');

    var s = stage.getBoundingClientRect();
    var g = guide.getBoundingClientRect();
    var overlapTop = Math.max(0, Math.ceil(s.top - g.top) + SAFETY);
    var overlapBottom = Math.max(0, Math.ceil(g.bottom - s.bottom) + SAFETY);

    root.style.setProperty('--art-buffer-top', overlapTop + 'px');
    root.style.setProperty('--art-buffer-bottom', overlapBottom + 'px');
  }

  apply();

  window.addEventListener('resize', measureArtOverlap);
  window.addEventListener('orientationchange', measureArtOverlap);
  (function () {
    var topImg = document.getElementById('top-art');
    var botImg = document.getElementById('bottom-art');
    [topImg, botImg].forEach(function (img) {
      if (!img) return;
      img.addEventListener('load', measureArtOverlap);
      img.addEventListener('error', measureArtOverlap);
    });
  })();

  /* ── 설정 패널 ─────────────────────────────────────────── */

  var panel = document.getElementById('panel');
  var waveInput = document.getElementById('wave');
  var periodInput = document.getElementById('period');
  var depthInput = document.getElementById('depth');
  var easeInput = document.getElementById('ease');
  var guideWInput = document.getElementById('guide-w');
  var guideHInput = document.getElementById('guide-h');
  var periodOut = document.getElementById('period-out');
  var depthOut = document.getElementById('depth-out');
  var guideWOut = document.getElementById('guide-w-out');
  var guideHOut = document.getElementById('guide-h-out');

  function syncInputs() {
    waveInput.value = state.wave;
    periodInput.min = minPeriod(state.wave);
    periodInput.value = state.period;
    depthInput.value = state.depth;
    easeInput.value = state.ease;
    guideWInput.value = state.guideW;
    guideHInput.value = state.guideH;

    var bpm = Math.round(60 / state.period);
    periodOut.textContent = Number(state.period).toFixed(1) + '초' +
      (state.wave === 'heart' ? '  (약 ' + bpm + ' BPM)' : '');
    depthOut.textContent = state.depth + '%  (밝기 100% ↔ ' + (100 - state.depth) + '%)';
    guideWOut.textContent = state.guideW + '%';
    guideHOut.textContent = state.guideH + '%';
  }

  function onChange() {
    state.wave = waveInput.value === 'heart' ? 'heart' : 'breathe';
    state.period = parseFloat(periodInput.value);
    state.depth = parseInt(depthInput.value, 10);
    state.ease = easeInput.value;
    state.guideW = parseInt(guideWInput.value, 10);
    state.guideH = parseInt(guideHInput.value, 10);
    apply();          // 여기서 파형별 하한으로 주기가 다시 가둬진다
    syncInputs();     // 그 결과를 슬라이더에 되돌려 표시
    save(state);
    renderDiag();
  }

  waveInput.addEventListener('change', onChange);
  periodInput.addEventListener('input', onChange);
  depthInput.addEventListener('input', onChange);
  easeInput.addEventListener('change', onChange);
  guideWInput.addEventListener('input', onChange);
  guideHInput.addEventListener('input', onChange);

  document.getElementById('panel-reset').addEventListener('click', function () {
    state = Object.assign({}, DEFAULTS);
    apply();
    syncInputs();
    save(state);
  });

  function openPanel() {
    syncInputs();
    renderDiag();
    panel.hidden = false;
    body.classList.add('panel-open');
  }

  document.getElementById('diag-fs').addEventListener('click', function () {
    goFullscreen();
    setTimeout(renderDiag, 400);
  });

  function closePanel() {
    panel.hidden = true;
    body.classList.remove('panel-open');
  }

  document.getElementById('panel-close').addEventListener('click', closePanel);
  panel.addEventListener('click', function (e) {
    if (e.target === panel) closePanel();   // 바깥 탭으로 닫기
  });

  /* 길게 누르기: 상단 문구 위에서만.
     카드는 아래 흰 무대에 놓이므로 여기까지 닿을 일이 없다. */
  (function longPress() {
    var title = document.getElementById('topbar');
    var timer = null;
    var startX = 0, startY = 0;

    function cancel() {
      if (timer) { clearTimeout(timer); timer = null; }
    }

    title.addEventListener('pointerdown', function (e) {
      startX = e.clientX; startY = e.clientY;
      cancel();
      timer = setTimeout(function () { timer = null; openPanel(); }, 1000);
    });

    title.addEventListener('pointermove', function (e) {
      if (!timer) return;
      if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) cancel();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      title.addEventListener(ev, cancel);
    });

    /* 데스크톱 확인용 단축키 */
    document.addEventListener('keydown', function (e) {
      if (e.key === 's' || e.key === 'S') { if (panel.hidden) { openPanel(); } else { closePanel(); } }
      if (e.key === 'Escape') closePanel();
    });
  })();

  /* ── 화면 꺼짐 방지 ────────────────────────────────────── */

  var wakeLock = null;
  var wakeLockOk = false;
  var videoOk = false;
  var warned = false;

  function supportsWakeLock() {
    return 'wakeLock' in navigator && navigator.wakeLock &&
           typeof navigator.wakeLock.request === 'function';
  }

  function requestWakeLock() {
    if (!supportsWakeLock() || document.visibilityState !== 'visible') {
      return Promise.resolve(false);
    }
    return navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      wakeLockOk = true;
      lock.addEventListener('release', function () { wakeLock = null; });
      return true;
    }).catch(function () {
      wakeLockOk = false;
      return false;
    });
  }

  var video = document.getElementById('keepalive');

  function startKeepaliveVideo() {
    if (!video) return Promise.resolve(false);
    video.muted = true;
    video.playsInline = true;
    var p;
    try { p = video.play(); } catch (e) { return Promise.resolve(false); }
    if (!p || typeof p.then !== 'function') { videoOk = true; return Promise.resolve(true); }
    return p.then(function () { videoOk = true; return true; })
            .catch(function () { videoOk = false; return false; });
  }

  function showSleepWarning() {
    var box = document.getElementById('sleep-warn');
    document.getElementById('sleep-warn-text').textContent = t('sleep');
    document.getElementById('sleep-warn-close').textContent = t('ok');
    box.hidden = false;
    document.getElementById('sleep-warn-close').addEventListener('click', function () {
      box.hidden = true;
    });
  }

  /* announce=true 일 때만 실패 안내를 띄운다.
     최초 시도는 탭이 아직 포그라운드가 아니거나 제스처 전이라 실패하기 쉬워,
     성급하게 경고를 띄우면 대부분 오탐이 된다. */
  function ensureAwake(announce) {
    return requestWakeLock().then(function (ok) {
      if (ok) return true;
      return startKeepaliveVideo();
    }).then(function (ok) {
      if (!ok && announce && !warned) {
        warned = true;
        showSleepWarning();
      }
      return ok;
    });
  }

  ensureAwake(false);

  /* iOS는 사용자 제스처 이후에야 허용되는 경우가 있어 첫 터치에서 한 번 더 시도.
     여기서도 실패하면 그때 안내한다. */
  (function retryOnFirstGesture() {
    function retry() {
      if (wakeLockOk || videoOk) return;
      ensureAwake(true);
    }
    document.addEventListener('pointerdown', retry, { once: true });
    document.addEventListener('touchstart', retry, { once: true, passive: true });
  })();

  /* 제스처가 아예 없어도, 화면이 보이는 상태로 8초가 지나도록 둘 다 실패면 안내 */
  setTimeout(function () {
    if (wakeLockOk || videoOk || warned) return;
    if (document.visibilityState !== 'visible') return;
    ensureAwake(true);
  }, 8000);

  /* 앱 전환 후 돌아오면 잠금이 풀려 있으므로 재요청 */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (!wakeLock) requestWakeLock();
    if (!wakeLockOk && video && video.paused) startKeepaliveVideo();
  });


  /* ── OS 상단바(시계·배터리) 숨기기 ─────────────────────
     안드로이드: Fullscreen API 로 실제로 숨겨진다. 사용자 제스처가 있어야 하므로
                 첫 탭에서 한 번만 시도하고, 사용자가 직접 빠져나오면 다시 강요하지 않는다.
     아이폰:     iPhone Safari 는 Fullscreen API 자체가 없다. 숨길 방법이 없어
                 index.html 의 black-translucent 로 눈에 덜 띄게 하는 것이 최선이다. */
  var fsState = { supported: false, tries: 0, lastError: '없음', active: false };

  /* ── 기기 · 브라우저 판별 ──────────────────────────────────
     아이폰은 애플 정책상 모든 브라우저가 WebKit(=Safari 엔진)을 쓴다.
     그래서 iOS 의 Chrome/Firefox/Edge 도 Safari 와 똑같이 전체화면 API 가 없다.
     다만 홈 화면에 추가해 standalone 으로 띄우는 것은 Safari 에서만 제대로 된다. */
  var ua = navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var iosNonSafari = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS|Whale/i.test(ua);

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           window.navigator.standalone === true;
  }

  /* 전체화면을 못 쓰는 기기에서 이유를 알려주는 안내 */
  var showFsNote = (function () {
    var box = document.getElementById('fs-note');
    var text = document.getElementById('fs-note-text');
    var timer = null;

    function hide() {
      box.hidden = true;
      if (timer) { clearTimeout(timer); timer = null; }
    }

    document.getElementById('fs-note-close').addEventListener('click', hide);

    return function (msg) {
      text.textContent = msg;
      document.getElementById('fs-note-close').textContent = t('ok');
      box.hidden = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(hide, 7000);   // 관상용 화면이니 알아서 사라지게
    };
  })();

  var goFullscreen = (function () {
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    fsState.supported = !!req;

    function isActive() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement) ||
             window.matchMedia('(display-mode: fullscreen)').matches;
    }

    function go() {
      fsState.active = isActive();
      if (!req || fsState.active) return;
      fsState.tries++;
      try {
        /* navigationUI 옵션을 붙이면 거부하는 구현이 있어 인자 없이 부른다 */
        var p = req.call(el);
        if (p && typeof p.catch === 'function') {
          p.then(function () { fsState.lastError = '성공'; fsState.active = true; })
           .catch(function (e) { fsState.lastError = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e)); });
        } else {
          fsState.lastError = '반환값 없음 (구형 API)';
        }
      } catch (e) {
        fsState.lastError = 'throw ' + (e && e.name ? e.name : '') + ': ' + (e && e.message ? e.message : String(e));
      }
    }

    /* 브라우저마다 '사용자 조작'으로 인정하는 이벤트가 다르다.
       터치에서는 pointerdown 이 인정 안 되고 touchend/click 에서만 되는 경우가 있어
       셋 다 듣는다. 성공할 때까지 계속 시도하되, 사용자가 직접 빠져나오면
       fullscreenchange 로 알 수 있으므로 다시 강요하지 않는다. */
    function exit() {
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (!ex) return;
      try {
        var p = ex.call(document);
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } catch (e) {}
    }

    /* 배너 두 번 탭 = 전체화면 켜기/끄기 */
    function toggle() {
      /* 아이폰 Safari 는 Element.requestFullscreen 자체가 없다(아이패드에만 있다).
         호출할 게 없어 아무 일도 안 일어나면 고장난 것처럼 보이므로 이유를 알린다. */
      if (!fsState.supported) {
        showFsNote(
          isStandalone() ? t('fs_standalone')
          : iosNonSafari ? t('fs_ios_other')
          : isIOS        ? t('fs_ios')
                         : t('fs_other')
        );
        return;
      }
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        userExited = true;      // 직접 끈 것이니 자동 진입이 다시 켜지 않게
        exit();
        return;
      }
      userExited = false;
      go();
    }

    /* 전체화면은 자동으로 걸지 않는다. 이 화면은 주소창이 보이는 일반 브라우저 탭에서
       보는 게 기본이고(특히 iPhone Safari 는 전체화면 API 자체가 없다), 전체화면은
       하단 배너를 두 번 탭했을 때만 켜지는 안드로이드 전용 이스터에그로 남겨둔다. */
    var userExited = false;
    var bottombar = document.getElementById('bottombar');

    /* 두 번 탭 인식은 직접 한다. 모바일에서 dblclick 은 브라우저마다 안 오는 경우가 있고,
       body 의 touch-action:none 때문에 더 불안정하다. */
    (function doubleTapBanner() {
      var lastTap = 0;
      var lastX = 0, lastY = 0;
      var GAP = 400;      // ms — 두 탭 사이 최대 간격
      var SLOP = 40;      // px — 두 탭 사이 최대 거리

      bottombar.addEventListener('pointerup', function (e) {
        var now = Date.now();
        var near = Math.abs(e.clientX - lastX) < SLOP && Math.abs(e.clientY - lastY) < SLOP;
        if (now - lastTap < GAP && near) {
          lastTap = 0;
          toggle();
        } else {
          lastTap = now;
          lastX = e.clientX;
          lastY = e.clientY;
        }
      });

      /* 두 번 탭이 확대·텍스트선택으로 새지 않게 */
      bottombar.addEventListener('dblclick', function (e) { e.preventDefault(); });
    })();
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () {
        var now = isActive();
        if (fsState.active && !now) userExited = true;   // 사용자가 직접 나감
        fsState.active = now;
      });
    });

    fsState.active = isActive();
    return go;
  })();

  /* ── 기기 진단 (설정 패널 안) ───────────────────────────
     안드로이드 실기기 동작을 추측으로 맞히기 어려워, 폰이 실제로 뭘 반환하는지
     그대로 보여준다. */
  function displayMode() {
    var modes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    for (var i = 0; i < modes.length; i++) {
      if (window.matchMedia('(display-mode: ' + modes[i] + ')').matches) return modes[i];
    }
    return 'unknown';
  }

  function renderDiag() {
    var el = document.getElementById('diag-body');
    if (!el) return;
    var lines = [
      'display-mode : ' + displayMode() + (window.navigator.standalone ? ' (iOS standalone)' : ''),
      '전체화면 API : ' + (fsState.supported ? '있음' : '없음') +
        (isIOS ? '  (아이폰은 브라우저 무관 WebKit)' : ''),
      '전체화면 상태 : ' + (fsState.active ? '켜짐' : '꺼짐'),
      '시도 횟수    : ' + fsState.tries,
      '마지막 결과  : ' + fsState.lastError,
      '화면         : ' + window.innerWidth + ' x ' + window.innerHeight +
        ' / dpr ' + (window.devicePixelRatio || 1),
      'UA           : ' + navigator.userAgent
    ];
    el.textContent = lines.join('\n');
  }

  /* ── 안내 배너가 하단 이미지 배너를 덮지 않게 ──────────────
     덮으면 '배너 두 번 탭 = 전체화면'이 막힌다. 하단 바 높이를 실측해 CSS 로 넘긴다. */
  (function measureBottombar() {
    var bar = document.getElementById('bottombar');
    function measure() {
      root.style.setProperty('--bottombar-h', Math.round(bar.getBoundingClientRect().height) + 'px');
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    /* 배너 이미지가 늦게 로드되면 높이가 달라진다 */
    var img = document.getElementById('bottom-art');
    if (img) { img.addEventListener('load', measure); img.addEventListener('error', measure); }
  })();

  /* ── 배너 이미지가 없을 때 자리표시 ────────────────────── */
  /* ── 상단 · 하단 아트워크 ────────────────────────────────
     언어별로 assets/top-<lang>.png, bottom-<lang>.png 를 갈아끼운다.
     파일이 없으면 그 자리는 비워둔다(흰 화면이라 티가 안 난다). */
  var setArt = (function () {
    var top = document.getElementById('top-art');
    var bottom = document.getElementById('bottom-art');

    function wire(img) {
      img.addEventListener('error', function () { img.hidden = true; });
      img.addEventListener('load', function () { img.hidden = false; });
    }
    wire(top); wire(bottom);

    return function (code) {
      top.hidden = false;
      bottom.hidden = false;
      top.src = 'assets/top-' + code + '.png';
      bottom.src = 'assets/bottom-' + code + '.png';
    };
  })();

  /* ── 필름 카드 접촉으로 인한 원치 않는 동작 차단 ──────── */
  (function harden() {
    var warnBox = document.getElementById('sleep-warn');

    function inUI(t) {
      return panel.contains(t) || warnBox.contains(t);
    }

    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
      document.addEventListener(ev, function (e) { e.preventDefault(); });
    });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { e.preventDefault(); });
    document.addEventListener('touchmove', function (e) {
      if (!inUI(e.target)) e.preventDefault();
    }, { passive: false });
  })();

  /* ── 언어 선택 ──────────────────────────────────────────
     QR 로 들어온 사람은 항상 이 화면부터 본다(기억하지 않는다).
     ?lang=ko|en|ja|zh 로 들어오면 건너뛴다 — 나라별 QR 을 따로 뿌릴 때 쓴다. */
  (function langPicker() {
    var pick = document.getElementById('langpick');

    function applyLang(code) {
      lang = code;
      root.lang = HTML_LANG[code] || code;
      setArt(code);
    }

    function open() {
      pick.hidden = false;
      body.classList.add('lang-pending');
    }

    function choose(code) {
      applyLang(code);
      pick.hidden = true;
      body.classList.remove('lang-pending');

      /* 언어 버튼 탭은 확실한 사용자 조작이라, 화면 꺼짐 방지는 여기서 거는 게
         성공률이 가장 높다. 전체화면은 더 이상 자동으로 걸지 않는다(하단 배너
         두 번 탭 전용 이스터에그). */
      ensureAwake(false);
    }

    [].forEach.call(document.querySelectorAll('.lang-btn'), function (b) {
      b.addEventListener('click', function () { choose(b.getAttribute('data-lang')); });
    });

    document.getElementById('panel-lang').addEventListener('click', function () {
      closePanel();
      open();
    });

    var q = new URLSearchParams(location.search).get('lang');
    if (LANGS.indexOf(q) !== -1) {
      applyLang(q);
      pick.hidden = true;
    } else {
      open();
    }
  })();

  /* ── 서비스 워커 (오프라인에서도 뜨게) ─────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
