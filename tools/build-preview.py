#!/usr/bin/env python3
"""Generate preview.html from index.html.

The Claude Artifact host supplies its own <!doctype>/<html>/<head>/<body>
skeleton, so a published page contributes only its head extras and body
content. This keeps index.html (the real, standalone site) as the single
source of truth and derives the preview from it.

Usage: python3 tools/build-preview.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "index.html").read_text()

head = re.search(r"<head>(.*?)</head>", src, re.S).group(1)
body = re.search(r"<body>(.*?)</body>", src, re.S).group(1)

# Carry over only what the host's skeleton does not already provide.
keep = [
    line for line in head.splitlines()
    if ("fonts.googleapis.com" in line
        or "fonts.gstatic.com" in line
        or 'href="assets/css/styles.css"' in line
        or line.lstrip().startswith("<noscript>"))
]

preview = "\n".join([
    "<title>MI MedCare</title>",
    *keep,
    "",
    "<script>",
    "  /* Commit to the brand's dark look before first paint, ahead of any",
    "     theme the host stamps on the root element. The in-page toggle and",
    "     the viewer's saved choice both still win over this. */",
    "  (function () {",
    "    var saved = null;",
    "    try { saved = localStorage.getItem('mimc-theme'); } catch (e) {}",
    "    document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');",
    "  })();",
    "</script>",
    body.rstrip(),
    "",
])

(ROOT / "preview.html").write_text(preview)
print("preview.html written ({:,} bytes)".format(len(preview)))
