/* =========================================================
   MI MedCare — interactions
   ========================================================= */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------- theme */
  (function theme() {
    var root = document.documentElement, btn = $('#themeToggle');
    var saved = null;
    try { saved = localStorage.getItem('mimc-theme'); } catch (e) {}
    if (saved) root.setAttribute('data-theme', saved);
    sync();

    function sync() {
      var light = root.getAttribute('data-theme') === 'light';
      if (btn) btn.setAttribute('aria-label', 'Switch to ' + (light ? 'dark' : 'light') + ' theme');
      var meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', light ? '#F6F8FC' : '#05070F');
    }

    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('mimc-theme', next); } catch (e) {}
      sync();
      document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    });
  })();

  /* ---------------------------------------------------- nav */
  (function nav() {
    var bar = $('#nav'), burger = $('#burger'), menu = $('#mobileMenu');

    function onScroll() {
      bar.classList.toggle('stuck', window.scrollY > 12);
      var top = $('#toTop');
      if (top) top.classList.toggle('show', window.scrollY > 700);
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var fill = $('.scroll-progress i');
      if (fill) fill.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function closeMenu() {
      if (!menu || menu.hidden) return;
      menu.hidden = true;
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
    }

    if (burger && menu) {
      burger.addEventListener('click', function () {
        var open = burger.getAttribute('aria-expanded') === 'true';
        menu.hidden = open;
        burger.setAttribute('aria-expanded', String(!open));
        burger.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      });
      $$('a', menu).forEach(function (a) { a.addEventListener('click', closeMenu); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
      window.addEventListener('resize', function () { if (window.innerWidth > 1080) closeMenu(); });
    }

    var top = $('#toTop');
    if (top) top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  })();

  /* ---------------------------------------------------- reveal on scroll */
  (function reveal() {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------- animated counters */
  (function counters() {
    var nodes = $$('.count');
    if (!nodes.length) return;

    function fmt(n, el) {
      var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      var v = n.toFixed(dec);
      return el.getAttribute('data-sep') ? Number(v).toLocaleString('en-US') : v;
    }

    function run(el) {
      var to = parseFloat(el.getAttribute('data-to')) || 0;
      if (reduced) { el.textContent = fmt(to, el); return; }
      var dur = 1600, t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(to * e, el);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------- hero claims feed */
  (function feed() {
    var list = $('#feed');
    if (!list || reduced) return;

    var rows = [
      ['is-ok',   'PAID',      'CPT 99213 · UnitedHealthcare', 132.75],
      ['is-ok',   'PAID',      'CPT 99214 · Aetna',            186.40],
      ['is-warn', 'SCRUBBED',  'Modifier 25 corrected',        212.00],
      ['is-ok',   'PAID',      'CPT 93000 · BCBS',              74.10],
      ['is-ok',   'PAID',      'CPT 90837 · Cigna',            142.85],
      ['is-warn', 'SCRUBBED',  'Dx specificity fixed',          96.50],
      ['is-ok',   'PAID',      'CPT 20610 · Medicare',         118.20],
      ['is-ok',   'PAID',      'CPT 99396 · Humana',           204.60],
      ['is-warn', 'SCRUBBED',  'Payer ID revalidated',         157.30],
      ['is-ok',   'PAID',      'CPT 95810 · BCBS',             389.00]
    ];
    var i = 0;

    setInterval(function () {
      if (document.hidden) return;
      var r = rows[i++ % rows.length];
      var li = document.createElement('li');
      li.className = 'new';
      li.innerHTML = '<span class="feed__tag ' + r[0] + '">' + r[1] + '</span>' +
                     '<span class="feed__txt"></span>' +
                     '<span class="feed__amt">' + (r[0] === 'is-warn' ? '+' : '') + '$' + r[3].toFixed(2) + '</span>';
      $('.feed__txt', li).textContent = r[2];
      list.insertBefore(li, list.firstChild);
      while (list.children.length > 4) list.removeChild(list.lastChild);
    }, 2600);
  })();

  /* ---------------------------------------------------- revenue cycle tabs */
  (function cycle() {
    var rail = $('.cycle__rail');
    if (!rail) return;

    var STAGES = [
      { t: 'Eligibility &amp; benefits verification',
        d: 'Before the patient is seen we confirm active coverage, plan type, deductible status, co-pay and whether a prior authorization is required. Catching a terminated policy here costs nothing — catching it after the visit costs you the whole claim.',
        p: ['Real-time payer eligibility checks', 'Prior authorization initiated up front', 'Patient responsibility estimated before the visit'],
        ml: 'Denials prevented at this stage', mv: '24%', ring: 24 },
      { t: 'Certified medical coding',
        d: 'AAPC-certified coders who work your specialty every day assign ICD-10-CM, CPT and HCPCS codes from the documentation — capturing everything you actually did, at the level of specificity payers require.',
        p: ['Specialty-specific code sets and modifiers', 'NCCI edit and bundling review', 'Documentation gap feedback to providers'],
        ml: 'Coding accuracy across audits', mv: '99%', ring: 99 },
      { t: 'Charge entry',
        d: 'Coded encounters are entered into your existing practice management system the same business day. Nothing sits in a queue waiting for someone to have a spare afternoon.',
        p: ['Same-day charge posting', 'Missing-charge reconciliation against the schedule', 'Fee schedule validation by payer'],
        ml: 'Charge lag', mv: '<1 day', ring: 92 },
      { t: 'Claim scrubbing',
        d: 'Every claim runs through payer-specific edit rules before it is transmitted. This is where the 98% clean claim rate is made — the vast majority of denials are caught and corrected while the claim is still ours.',
        p: ['Payer-specific edit rules', 'Demographic and eligibility cross-check', 'Automated + human second pass'],
        ml: 'First-pass clean claim rate', mv: '98%', ring: 98 },
      { t: 'Submission &amp; tracking',
        d: 'Claims go out electronically in ANSI X12 837 format with clearinghouse acknowledgements tracked to acceptance. Rejections surface in hours, not on next month’s aging report.',
        p: ['Electronic + secondary/paper submission', 'Clearinghouse acknowledgement tracking', 'Rejections reworked within 24 hours'],
        ml: 'Claims submitted electronically', mv: '97%', ring: 97 },
      { t: 'Payment posting &amp; reconciliation',
        d: 'ERA and EOB payments are posted line by line and reconciled to the bank deposit. Underpayments against your contracted rates are flagged instead of quietly accepted.',
        p: ['Line-level ERA/EOB posting', 'Contractual underpayment detection', 'Patient balance statements triggered'],
        ml: 'Underpayments identified', mv: '3.4%', ring: 34 },
      { t: 'Denial management &amp; A/R recovery',
        d: 'Every denial gets a root cause, not just a resubmission. Appeals are filed within 48 hours, aged A/R is worked oldest-value-first, and the same denial reason does not get to happen twice.',
        p: ['Appeals filed within 48 hours', 'Root-cause analysis fed back into scrubbing', 'Aged A/R clean-up projects'],
        ml: 'Reduction in denial rate', mv: '40%', ring: 40 },
      { t: 'Reporting &amp; optimization',
        d: 'A live dashboard shows collections, days in A/R, denial reasons and payer performance — and a human walks you through it every month with the specific changes that will move the number.',
        p: ['Live KPI dashboard', 'Payer contract performance analysis', 'Monthly review with your account manager'],
        ml: 'Average days in A/R', mv: '21', ring: 76 }
    ];

    var nodes = $$('.node', rail);
    var fill = $('#cycleFill');
    var body = $('.cycle__body');
    var elStep = $('#cyStep'), elTitle = $('#cyTitle'), elText = $('#cyText'),
        elPoints = $('#cyPoints'), elML = $('#cyMetricLabel'), elMV = $('#cyMetricValue'), elRing = $('#cyRing');
    var current = 0, timer = null;

    function show(i) {
      current = i;
      var s = STAGES[i];

      nodes.forEach(function (n, k) {
        var active = k === i;
        n.classList.toggle('is-active', active);
        n.classList.toggle('is-done', k < i);
        n.setAttribute('aria-selected', String(active));
        n.tabIndex = active ? 0 : -1;
      });

      if (fill) fill.style.width = ((i + 1) / STAGES.length) * 100 + '%';

      elStep.textContent = 'Stage ' + String(i + 1).padStart(2, '0');
      elTitle.innerHTML = s.t;
      elText.textContent = s.d;
      elPoints.innerHTML = '';
      s.p.forEach(function (p) {
        var li = document.createElement('li');
        li.textContent = p;
        elPoints.appendChild(li);
      });
      elML.textContent = s.ml;
      elMV.textContent = s.mv;
      if (elRing) elRing.style.strokeDashoffset = String(327 - (327 * s.ring) / 100);

      if (!reduced) {
        body.classList.remove('fade');
        void body.offsetWidth;
        body.classList.add('fade');
      }
      $('#panel-cycle').setAttribute('aria-labelledby', 'tab-' + i);

      /* on narrow screens the rail scrolls horizontally — keep the active node in view */
      if (rail.scrollWidth > rail.clientWidth + 4) {
        var n = nodes[i];
        rail.scrollTo({
          left: n.offsetLeft - (rail.clientWidth - n.offsetWidth) / 2,
          behavior: reduced ? 'auto' : 'smooth'
        });
      }
    }

    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }
    function startAuto() {
      if (reduced || timer) return;
      timer = setInterval(function () {
        if (!document.hidden) show((current + 1) % STAGES.length);
      }, 5200);
    }

    nodes.forEach(function (n) {
      n.addEventListener('click', function () { stopAuto(); show(parseInt(n.getAttribute('data-i'), 10)); });
    });

    rail.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      stopAuto();
      var next = (current + d + STAGES.length) % STAGES.length;
      show(next);
      nodes[next].focus();
    });

    rail.addEventListener('mouseenter', stopAuto);
    $('.cycle__wrap').addEventListener('focusin', stopAuto);

    show(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        en[0].isIntersecting ? startAuto() : stopAuto();
      }, { threshold: 0.3 }).observe(rail);
    } else { startAuto(); }
  })();

  /* ---------------------------------------------------- ROI calculator */
  (function roi() {
    var form = $('#roiForm');
    if (!form) return;

    var rClaims = $('#rClaims'), rValue = $('#rValue'), rDenial = $('#rDenial'), rRework = $('#rRework');
    var oClaims = $('#oClaims'), oValue = $('#oValue'), oDenial = $('#oDenial'), oRework = $('#oRework');
    var big = $('#roiBig'), lostNow = $('#roiLostNow'), lostNew = $('#roiLostNew');
    var barNow = $('#roiBarNow'), barNew = $('#roiBarNew');
    var hours = $('#roiHours'), rate = $('#roiRate');

    var MIMC_DENIAL = 0.02;   /* projected denial rate with MI MedCare */
    var MIMC_REWORK = 0.92;   /* share of remaining denials successfully worked */
    var MIN_PER_REWORK = 22;  /* staff minutes to rework one denial in-house */

    var usd0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
    function money(n) { return '$' + usd0.format(Math.round(n)); }

    var shown = 0;
    function paint(target) {
      if (reduced) { big.textContent = usd0.format(Math.round(target)); shown = target; return; }
      var from = shown, t0 = null;
      shown = target;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / 450, 1);
        var e = 1 - Math.pow(1 - p, 3);
        big.textContent = usd0.format(Math.round(from + (target - from) * e));
        if (p < 1 && shown === target) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function calc() {
      var claims = +rClaims.value, value = +rValue.value;
      var denial = +rDenial.value / 100, rework = +rRework.value / 100;

      oClaims.textContent = usd0.format(claims);
      oValue.textContent = '$' + value;
      oDenial.textContent = rDenial.value + '%';
      oRework.textContent = rRework.value + '%';

      var annual = claims * 12;
      /* revenue lost = denied claims that are never successfully recovered */
      var lostA = annual * denial * (1 - rework) * value;
      var lostB = annual * MIMC_DENIAL * (1 - MIMC_REWORK) * value;
      var gain = Math.max(lostA - lostB, 0);

      lostNow.textContent = money(lostA);
      lostNew.textContent = money(lostB);
      var max = Math.max(lostA, lostB, 1);
      barNow.style.setProperty('--w', (lostA / max) * 100 + '%');
      barNew.style.setProperty('--w', Math.max((lostB / max) * 100, 2) + '%');

      hours.textContent = usd0.format(Math.round((annual * denial * rework * MIN_PER_REWORK) / 60));
      rate.textContent = '2%';
      paint(gain);
    }

    [rClaims, rValue, rDenial, rRework].forEach(function (el) {
      el.addEventListener('input', calc);
      el.addEventListener('change', calc);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    calc();
  })();

  /* ---------------------------------------------------- specialties */
  (function specialties() {
    var grid = $('#specGrid');
    if (!grid) return;

    var LIST = [
      'Family Medicine','Internal Medicine','Cardiology','Psychiatry','Behavioral Health','Pediatrics',
      'Orthopedics','Dermatology','Neurology','Gastroenterology','Urology','Nephrology','Endocrinology',
      'Pulmonology','Rheumatology','Oncology','Hematology','Sleep Medicine','Pain Management',
      'Physical Therapy','Occupational Therapy','Speech Therapy','Chiropractic','Podiatry',
      'OB/GYN','Birth Center & Midwifery','Fertility','Ophthalmology','Optometry','ENT / Otolaryngology',
      'Dental','Oral Surgery','General Surgery','Plastic Surgery','Vascular Surgery','Anesthesiology',
      'Radiology','Pathology','Emergency Medicine','Urgent Care','Wound Care','Allergy & Immunology',
      'Infectious Disease','Geriatrics','Home Health','Hospice & Palliative','DME','Ambulatory Surgery Center',
      'Laboratory','Telehealth'
    ];

    var input = $('#specSearch'), count = $('#specCount'), empty = $('#specEmpty');

    LIST.forEach(function (name) {
      var li = document.createElement('li');
      li.textContent = name;
      li.setAttribute('data-name', name.toLowerCase());
      grid.appendChild(li);
    });

    var items = $$('li', grid);
    function setCount(n) { count.textContent = n + (n === 1 ? ' specialty' : ' specialties'); }
    setCount(items.length);

    if (!input) return;
    var t;
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        items.forEach(function (li) {
          var hit = !q || li.getAttribute('data-name').indexOf(q) !== -1;
          li.classList.toggle('hide', !hit);
          if (hit) shown++;
        });
        setCount(shown);
        empty.hidden = shown !== 0;
      }, 110);
    });

    /* mirror the list into the audit form's specialty select */
    var sel = $('#fSpec');
    if (sel) {
      LIST.concat(['Other']).forEach(function (name) {
        var o = document.createElement('option');
        o.textContent = name;
        sel.appendChild(o);
      });
    }
  })();

  /* ---------------------------------------------------- audit form */
  (function auditForm() {
    var form = $('#auditForm');
    if (!form) return;
    var ok = $('#auditOk');

    function validate(el) {
      var wrap = el.closest('.inp');
      var v = el.value.trim();
      var bad = false;
      if (el.hasAttribute('required') && !v) bad = true;
      if (el.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) bad = true;
      if (el.type === 'tel' && v && v.replace(/\D/g, '').length < 7) bad = true;
      wrap.classList.toggle('invalid', bad);
      return !bad;
    }

    $$('input, select, textarea', form).forEach(function (el) {
      el.addEventListener('blur', function () { validate(el); });
      el.addEventListener('input', function () {
        if (el.closest('.inp').classList.contains('invalid')) validate(el);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = $$('input, select, textarea', form);
      var valid = true, first = null;
      fields.forEach(function (el) {
        if (!validate(el) && valid) { valid = false; first = el; }
      });
      if (!valid) { first.focus(); return; }

      /* Front-end only: wire this to your CRM / form endpoint. */
      ok.hidden = false;
      form.reset();
      ok.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    });
  })();

  /* ---------------------------------------------------- card glow + tilt */
  (function tilt() {
    if (reduced || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

    $$('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    var glow = $('.cursor-glow');
    if (glow) {
      var gx = window.innerWidth / 2, gy = window.innerHeight / 2, tx = gx, ty = gy, raf = null;
      window.addEventListener('pointermove', function (e) {
        tx = e.clientX; ty = e.clientY;
        if (!raf) raf = requestAnimationFrame(loop);
      }, { passive: true });
      function loop() {
        raf = null;
        gx += (tx - gx) * 0.12;
        gy += (ty - gy) * 0.12;
        glow.style.transform = 'translate(' + (gx - 200) + 'px,' + (gy - 200) + 'px)';
        if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) raf = requestAnimationFrame(loop);
      }
      glow.style.left = '0'; glow.style.top = '0';
      loop();
    }
  })();

  /* ---------------------------------------------------- misc */
  var yr = $('#yr');
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
