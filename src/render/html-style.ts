/** Inline stylesheet of html/index.html. No text is smaller than 16px; light and dark themes. */
export const HTML_STYLE = `
:root {
  --bg: #fbfaf7; --fg: #1d1d1b; --muted: #55534d; --line: #dedad0; --panel: #f2efe7;
  --accent: #1a56b8; --head: #13306b; --mark: #fff3b0; --code: #ece8dc;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #15161a; --fg: #e8e6e1; --muted: #a9a59b; --line: #34363d; --panel: #1d1f24;
    --accent: #8fb4ff; --head: #c7d7ff; --mark: #5a4b00; --code: #262830;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #15161a; --fg: #e8e6e1; --muted: #a9a59b; --line: #34363d; --panel: #1d1f24;
  --accent: #8fb4ff; --head: #c7d7ff; --mark: #5a4b00; --code: #262830;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { font-size: 18px; scroll-padding-top: 16px; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 1rem/1.6 Georgia, "Iowan Old Style", "Times New Roman", serif; }
a { color: var(--accent); }
.layout { display: grid; grid-template-columns: minmax(260px, 340px) minmax(0, 1fr); max-width: 1400px; margin: 0 auto; }
nav.toc { position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 24px 16px; border-right: 1px solid var(--line); background: var(--panel); font: 16px/1.45 system-ui, sans-serif; }
nav.toc ul { list-style: none; margin: 0; padding-left: 14px; }
nav.toc > ul { padding-left: 0; }
nav.toc li { margin: 4px 0; }
nav.toc a { text-decoration: none; color: var(--fg); }
nav.toc a:hover { color: var(--accent); text-decoration: underline; }
nav.toc .l1 > a { font-weight: 700; color: var(--head); }
main { padding: 24px 40px 80px; min-width: 0; }
header.doc { border-bottom: 1px solid var(--line); margin-bottom: 24px; padding-bottom: 16px; }
header.doc h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 8px; color: var(--head); }
.notice { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px; font: 16px/1.5 system-ui, sans-serif; }
.formats { font: 16px/1.5 system-ui, sans-serif; }
h1, h2, h3, h4 { color: var(--head); line-height: 1.25; font-family: system-ui, sans-serif; }
h1.s { font-size: 1.9rem; margin-top: 56px; border-top: 3px solid var(--head); padding-top: 16px; }
h2 { font-size: 1.5rem; margin-top: 44px; }
h3 { font-size: 1.25rem; margin-top: 32px; }
h4 { font-size: 1.1rem; margin-top: 24px; }
.src { font-size: 16px; font-weight: 400; margin-left: 8px; white-space: nowrap; }
.pg { display: block; margin: 20px 0 8px; font: 16px/1.4 system-ui, sans-serif; color: var(--muted); border-top: 1px dashed var(--line); padding-top: 4px; text-align: right; }
.pg a { color: var(--muted); }
blockquote { margin: 16px 0; padding: 4px 16px; border-left: 4px solid var(--line); }
.tbl { overflow-x: auto; margin: 16px 0; }
table { border-collapse: collapse; width: 100%; font: 16px/1.5 system-ui, sans-serif; }
th, td { border: 1px solid var(--line); padding: 8px 10px; vertical-align: top; text-align: left; }
th { background: var(--panel); }
td p, th p { margin: 0 0 8px; }
td p:last-child, th p:last-child { margin-bottom: 0; }
h1 > a:first-child, h2 > a:first-child, h3 > a:first-child, h4 > a:first-child { color: inherit; text-decoration: none; }
h1 > a:first-child:hover, h2 > a:first-child:hover, h3 > a:first-child:hover, h4 > a:first-child:hover { text-decoration: underline; }
section:target > :first-child { background: var(--mark); border-radius: 4px; }
.pg:target { color: var(--fg); background: var(--mark); }
button.theme { font: 16px system-ui, sans-serif; background: var(--panel); color: var(--fg); border: 1px solid var(--line); border-radius: 6px; padding: 6px 12px; cursor: pointer; }
@media (max-width: 900px) {
  .layout { display: block; }
  nav.toc { position: static; height: auto; max-height: 60vh; border-right: 0; border-bottom: 1px solid var(--line); }
  main { padding: 16px 16px 64px; }
}
`;

/** Theme toggle; the choice is remembered per viewer when storage is available. */
export const HTML_SCRIPT = `
(function () {
  var root = document.documentElement;
  try { var saved = localStorage.getItem('qrg-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  var btn = document.getElementById('theme');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('qrg-theme', next); } catch (e) {}
  });
})();
`;
