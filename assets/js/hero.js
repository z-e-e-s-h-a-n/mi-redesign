/* =========================================================
   MI MedCare — 3D hero field (raw WebGL, zero dependencies)
   A rotating point cloud of "claims" with proximity links.
   Falls back silently if WebGL is unavailable.
   ========================================================= */
(function () {
  'use strict';

  var canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false })
        || canvas.getContext('experimental-webgl');
  if (!gl) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- palette (kept in sync with the CSS theme) ---------- */
  var THEMES = {
    dark:  { a: [0.00, 0.90, 0.75], b: [0.31, 0.49, 1.00], c: [0.66, 0.33, 0.97], line: 1.15, pt: 1.5 },
    light: { a: [0.00, 0.60, 0.52], b: [0.23, 0.39, 0.91], c: [0.55, 0.25, 0.88], line: 0.55, pt: 1.1 }
  };
  var theme = THEMES[document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'];

  /* ---------- shaders ---------- */
  var VS_POINT = [
    'attribute vec3 aPos; attribute float aSeed;',
    'uniform mat4 uMVP; uniform float uTime; uniform float uDpr; uniform float uPt;',
    'varying float vDepth; varying float vTwinkle;',
    'void main(){',
    '  vec3 p = aPos;',
    '  p.y += sin(uTime * 0.55 + aSeed * 6.283) * 0.055;',
    '  p.x += cos(uTime * 0.42 + aSeed * 4.712) * 0.045;',
    '  vec4 clip = uMVP * vec4(p, 1.0);',
    '  gl_Position = clip;',
    '  vDepth = clamp((clip.w - 1.6) / 3.4, 0.0, 1.0);',
    '  vTwinkle = 0.55 + 0.45 * sin(uTime * 1.7 + aSeed * 12.566);',
    '  gl_PointSize = uDpr * uPt * (11.0 - vDepth * 7.0);',
    '}'
  ].join('\n');

  var FS_POINT = [
    'precision mediump float;',
    'uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;',
    'varying float vDepth; varying float vTwinkle;',
    'void main(){',
    '  vec2 d = gl_PointCoord - vec2(0.5);',
    '  float r = dot(d, d);',
    '  if (r > 0.25) discard;',
    '  float core = smoothstep(0.25, 0.0, r);',
    '  vec3 col = mix(uA, uB, smoothstep(0.0, 0.55, vDepth));',
    '  col = mix(col, uC, smoothstep(0.55, 1.0, vDepth));',
    '  float a = core * (1.0 - vDepth * 0.55) * vTwinkle;',
    '  gl_FragColor = vec4(col, a);',
    '}'
  ].join('\n');

  var VS_LINE = [
    'attribute vec3 aPos; attribute float aAlpha;',
    'uniform mat4 uMVP;',
    'varying float vAlpha; varying float vDepth;',
    'void main(){',
    '  vec4 clip = uMVP * vec4(aPos, 1.0);',
    '  gl_Position = clip;',
    '  vDepth = clamp((clip.w - 1.6) / 3.4, 0.0, 1.0);',
    '  vAlpha = aAlpha;',
    '}'
  ].join('\n');

  var FS_LINE = [
    'precision mediump float;',
    'uniform vec3 uA; uniform vec3 uB; uniform float uLine;',
    'varying float vAlpha; varying float vDepth;',
    'void main(){',
    '  vec3 col = mix(uA, uB, vDepth);',
    '  gl_FragColor = vec4(col, vAlpha * vAlpha * uLine * (1.0 - vDepth * 0.55));',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  function program(vs, fs) {
    var v = compile(gl.VERTEX_SHADER, vs), f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }

  var pPoint = program(VS_POINT, FS_POINT);
  var pLine  = program(VS_LINE, FS_LINE);
  if (!pPoint || !pLine) return;

  /* ---------- geometry: a hollow shell of "claims" ---------- */
  var N = window.innerWidth < 760 ? 110 : 190;
  var pos = new Float32Array(N * 3);
  var seed = new Float32Array(N);

  for (var i = 0; i < N; i++) {
    var u = Math.random() * 2 - 1;
    var t = Math.random() * Math.PI * 2;
    var r = 1.55 + Math.random() * 0.55;
    var s = Math.sqrt(1 - u * u);
    pos[i * 3]     = Math.cos(t) * s * r * 1.55;
    pos[i * 3 + 1] = u * r * 0.82;
    pos[i * 3 + 2] = Math.sin(t) * s * r;
    seed[i] = Math.random();
  }

  var bufPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);

  var bufSeed = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufSeed);
  gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);

  /* proximity links, computed once against base positions */
  var LINK_DIST = 0.92;
  var lineVerts = [], lineAlphas = [];
  for (var a = 0; a < N; a++) {
    for (var b = a + 1; b < N; b++) {
      var dx = pos[a * 3] - pos[b * 3];
      var dy = pos[a * 3 + 1] - pos[b * 3 + 1];
      var dz = pos[a * 3 + 2] - pos[b * 3 + 2];
      var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < LINK_DIST) {
        var al = 1 - d / LINK_DIST;
        lineVerts.push(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2],
                       pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]);
        lineAlphas.push(al, al);
      }
    }
  }
  var LINE_COUNT = lineAlphas.length;
  var bufLine = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufLine);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVerts), gl.STATIC_DRAW);
  var bufLineA = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufLineA);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineAlphas), gl.STATIC_DRAW);

  /* ---------- tiny mat4 ---------- */
  function mul(o, x, y) {
    for (var c = 0; c < 4; c++) {
      for (var r2 = 0; r2 < 4; r2++) {
        o[c * 4 + r2] = x[r2] * y[c * 4] + x[4 + r2] * y[c * 4 + 1] +
                        x[8 + r2] * y[c * 4 + 2] + x[12 + r2] * y[c * 4 + 3];
      }
    }
    return o;
  }
  function perspective(o, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = (far + near) * nf; o[11] = -1;
    o[12] = 0; o[13] = 0; o[14] = 2 * far * near * nf; o[15] = 0;
    return o;
  }
  function viewMat(o, rx, ry, dist) {
    var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    o[0] = cy;       o[1] = sx * sy;  o[2] = -cx * sy; o[3] = 0;
    o[4] = 0;        o[5] = cx;       o[6] = sx;       o[7] = 0;
    o[8] = sy;       o[9] = -sx * cy; o[10] = cx * cy; o[11] = 0;
    o[12] = 0;       o[13] = 0;       o[14] = -dist;   o[15] = 1;
    return o;
  }

  var mProj = new Float32Array(16), mView = new Float32Array(16), mMVP = new Float32Array(16);

  /* ---------- sizing ---------- */
  var dpr = 1, W = 0, H = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width * dpr));
    H = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
  }

  /* ---------- pointer parallax ---------- */
  var tX = 0, tY = 0, pX = 0, pY = 0;
  if (!reduced && window.matchMedia('(hover:hover)').matches) {
    window.addEventListener('pointermove', function (e) {
      tX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      tY = (e.clientY / window.innerHeight - 0.5) * 0.3;
    }, { passive: true });
  }

  /* ---------- locations ---------- */
  var L = {
    pPos: gl.getAttribLocation(pPoint, 'aPos'),
    pSeed: gl.getAttribLocation(pPoint, 'aSeed'),
    pMVP: gl.getUniformLocation(pPoint, 'uMVP'),
    pTime: gl.getUniformLocation(pPoint, 'uTime'),
    pDpr: gl.getUniformLocation(pPoint, 'uDpr'),
    pPt: gl.getUniformLocation(pPoint, 'uPt'),
    pA: gl.getUniformLocation(pPoint, 'uA'),
    pB: gl.getUniformLocation(pPoint, 'uB'),
    pC: gl.getUniformLocation(pPoint, 'uC'),
    lPos: gl.getAttribLocation(pLine, 'aPos'),
    lAlpha: gl.getAttribLocation(pLine, 'aAlpha'),
    lMVP: gl.getUniformLocation(pLine, 'uMVP'),
    lA: gl.getUniformLocation(pLine, 'uA'),
    lB: gl.getUniformLocation(pLine, 'uB'),
    lLine: gl.getUniformLocation(pLine, 'uLine')
  };

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);

  /* additive reads as glow on a dark page; on a light page it washes out,
     so light mode composites normally instead. */
  function setBlend() {
    if (document.documentElement.getAttribute('data-theme') === 'light') {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    }
  }
  setBlend();

  /* ---------- loop ---------- */
  var start = performance.now(), raf = null, visible = true;

  function frame(now) {
    raf = null;
    var t = (now - start) / 1000;

    pX += (tX - pX) * 0.05;
    pY += (tY - pY) * 0.05;

    resize();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    perspective(mProj, 0.95, W / H, 0.1, 100);
    viewMat(mView, 0.18 + pY, (reduced ? 0.6 : t * 0.075) + pX, 4.1);
    mul(mMVP, mProj, mView);

    /* links */
    gl.useProgram(pLine);
    gl.uniformMatrix4fv(L.lMVP, false, mMVP);
    gl.uniform3fv(L.lA, theme.a);
    gl.uniform3fv(L.lB, theme.c);
    gl.uniform1f(L.lLine, theme.line);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufLine);
    gl.enableVertexAttribArray(L.lPos);
    gl.vertexAttribPointer(L.lPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufLineA);
    gl.enableVertexAttribArray(L.lAlpha);
    gl.vertexAttribPointer(L.lAlpha, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, LINE_COUNT);

    /* nodes */
    gl.useProgram(pPoint);
    gl.uniformMatrix4fv(L.pMVP, false, mMVP);
    gl.uniform1f(L.pTime, reduced ? 0 : t);
    gl.uniform1f(L.pDpr, dpr);
    gl.uniform1f(L.pPt, theme.pt);
    gl.uniform3fv(L.pA, theme.a);
    gl.uniform3fv(L.pB, theme.b);
    gl.uniform3fv(L.pC, theme.c);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
    gl.enableVertexAttribArray(L.pPos);
    gl.vertexAttribPointer(L.pPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufSeed);
    gl.enableVertexAttribArray(L.pSeed);
    gl.vertexAttribPointer(L.pSeed, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, N);

    if (!reduced && visible) raf = requestAnimationFrame(frame);
  }

  function play() { if (!raf && visible) raf = requestAnimationFrame(frame); }
  function pause() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  /* only animate while the hero is on screen and the tab is focused */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      visible ? play() : pause();
    }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { pause(); } else { visible = true; play(); }
  });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { requestAnimationFrame(frame); }, 120);
  }, { passive: true });

  document.addEventListener('themechange', function (e) {
    theme = THEMES[e.detail === 'light' ? 'light' : 'dark'];
    setBlend();
    requestAnimationFrame(frame);
  });

  requestAnimationFrame(frame);
})();
