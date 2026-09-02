/**
 * The setup screen, served on this computer only.
 *
 * One HTML file with no build step and no dependencies, because the thing
 * standing between a shop and a working printer should not be a toolchain.
 * It looks like the DigiConnect dashboard on purpose: a partner who has just
 * copied their key from the website should recognise where they have landed.
 */

export function renderPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>DigiConnect Print Station</title>
<style>
  :root {
    --ink: #0b1220; --body: #55617a; --line: rgba(15,32,73,.12);
    --blue: linear-gradient(135deg,#1f4fd8,#3b82f6); --flame: #f4632e;
    --ok: #0f9d58; --bg: #eef2fb;
  }
  * { box-sizing: border-box; }
  /* Every pill here is display:inline-flex, which outranks the hidden
     attribute's own rule and would leave an empty bubble on the screen. */
  [hidden] { display: none !important; }
  body { margin:0; background:
      radial-gradient(1000px 600px at 15% -10%, #dfe8ff 0%, transparent 60%),
      radial-gradient(800px 500px at 95% 0%, #ffe6dc 0%, transparent 55%), var(--bg);
    font: 14px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--ink);
    min-height: 100vh; padding: 28px 16px 64px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  .card { background: rgba(255,255,255,.72); backdrop-filter: blur(18px);
    border: 1px solid var(--line); border-radius: 20px; padding: 20px;
    box-shadow: 0 18px 50px -30px rgba(15,32,73,.5); margin-bottom: 16px; }
  h1 { font-size: 21px; margin: 0; letter-spacing: -.4px; }
  h2 { font-size: 14px; margin: 0 0 12px; }
  p { color: var(--body); margin: 6px 0 0; }
  .head { display:flex; align-items:center; gap:12px; }
  .mark { width:44px; height:44px; border-radius:14px; background: var(--blue); color:#fff;
    display:grid; place-items:center; font-size:20px; flex:none; }
  label { display:block; margin-top:14px; font-size:12px; font-weight:700; }
  input, select { width:100%; margin-top:6px; padding:11px 12px; border-radius:12px;
    border:1px solid var(--line); background:rgba(255,255,255,.9); font:inherit; color:var(--ink); }
  input:focus, select:focus { outline:2px solid #3b82f6; outline-offset:1px; }
  .row { display:flex; gap:10px; flex-wrap:wrap; margin-top:16px; }
  button { border:0; border-radius:12px; padding:11px 18px; font:inherit; font-weight:700; cursor:pointer; }
  .primary { background: var(--blue); color:#fff; }
  .ghost { background: rgba(255,255,255,.9); border:1px solid var(--line); color:var(--body); }
  button:disabled { opacity:.55; cursor:default; }
  .pill { display:inline-flex; align-items:center; gap:7px; font-weight:800; font-size:12.5px;
    padding:6px 12px; border-radius:999px; background:rgba(255,255,255,.9); border:1px solid var(--line); }
  .dot { width:8px; height:8px; border-radius:50%; background:#c3cbdc; }
  .on .dot { background: var(--ok); box-shadow:0 0 0 4px rgba(15,157,88,.15); }
  .off .dot { background: var(--flame); box-shadow:0 0 0 4px rgba(244,99,46,.15); }
  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:14px; }
  .stat { background:rgba(255,255,255,.9); border:1px solid var(--line); border-radius:14px; padding:12px; }
  .stat b { display:block; font-size:21px; letter-spacing:-.5px; }
  .stat span { font-size:11.5px; color:var(--body); font-weight:600; }
  .log { margin-top:14px; max-height:260px; overflow:auto; font:12px/1.6 ui-monospace, Menlo, Consolas, monospace; }
  .log div { padding:4px 0; border-bottom:1px dashed var(--line); color:var(--body); }
  .log .error { color:var(--flame); font-weight:700; }
  .log .success { color:var(--ok); }
  .log .warn { color:#b26a00; }
  .warn-box { margin-top:12px; border-left:3px solid var(--flame); padding:10px 12px;
    background:rgba(244,99,46,.07); border-radius:0 12px 12px 0; font-size:12.5px; }
  /* Deliberately not ".mark": that class is already the 44px header tile
     above, and reusing it made every finding sprout a blue square. */
  .findings { margin-top:14px; display:grid; gap:6px; }
  .finding { display:grid; grid-template-columns:5.2rem 1fr; gap:10px; align-items:baseline;
    padding:9px 12px; border-radius:10px; border:1px solid var(--line);
    background:rgba(255,255,255,.92); font-size:12.5px; line-height:1.5; color:var(--body); }
  .finding .tag { font-weight:800; font-size:10.5px; letter-spacing:.09em; text-transform:uppercase; }
  .finding.ok    { border-left:3px solid var(--ok); }
  .finding.ok    .tag { color:var(--ok); }
  .finding.error { border-left:3px solid var(--flame); background:rgba(244,99,46,.06); }
  .finding.error .tag, .finding.error span:last-child { color:var(--flame); font-weight:600; }
  .finding.warn  { border-left:3px solid #b26a00; }
  .finding.warn  .tag { color:#b26a00; }
  .finding.info  { opacity:.85; }
  .finding.info  .tag { color:var(--faint, #9aa4b8); }
  .finding.fix   { border-left:3px solid #1f4fd8; background:rgba(31,79,216,.06); }
  .finding.fix   .tag { color:#1f4fd8; }
  .finding.fix   span:last-child { color:var(--ink); font-weight:600; }
  .muted { font-size:12px; color:var(--body); }
  a { color:#1f4fd8; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="head">
      <span class="mark">&#128424;</span>
      <div>
        <h1>DigiConnect Print Station</h1>
        <p class="muted">This computer prints what your customers order.</p>
      </div>
    </div>
    <div class="row" id="status-row">
      <span class="pill" id="conn"><span class="dot"></span><span id="conn-text">Starting…</span></span>
      <span class="pill" id="station-pill" hidden></span>
    </div>
    <div class="stats">
      <div class="stat"><b id="s-queued">0</b><span>Waiting</span></div>
      <div class="stat"><b id="s-printed">0</b><span>Printed</span></div>
      <div class="stat"><b id="s-failed">0</b><span>Failed</span></div>
    </div>
    <div class="warn-box" id="problem" hidden></div>
    <div class="findings" id="findings" hidden></div>
  </div>

  <div class="card">
    <h2>Settings</h2>
    <form id="form">
      <label>Your key
        <input name="agentToken" id="agentToken" placeholder="dcp_…" autocomplete="off" spellcheck="false" />
      </label>
      <p class="muted">Copy it from your partner dashboard &rarr; Print counter. It is shown only once.</p>

      <label>Printer
        <select name="printerName" id="printerName"></select>
      </label>

      <label>Website address
        <input name="serverUrl" id="serverUrl" />
      </label>

      <label>Check for new jobs every
        <input name="pollSeconds" id="pollSeconds" type="number" min="2" max="60" />
      </label>

      <label style="margin-top:14px; font-weight:600; display:flex; gap:9px; align-items:center;">
        <input type="checkbox" name="duplex" id="duplex" style="width:auto; margin:0;" />
        Print on both sides when the printer supports it
      </label>

      <div class="row">
        <button class="primary" type="submit" id="save">Save and start</button>
        <button class="ghost" type="button" id="check">Kya galat hai? Check kijiye</button>
        <button class="ghost" type="button" id="test">Print a test page</button>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>What has happened</h2>
    <div class="log" id="log"></div>
  </div>
</div>

<script>
  const $ = (id) => document.getElementById(id);
  let loadedOnce = false;

  function paint(state) {
    const conn = $("conn");
    conn.className = "pill " + (state.running && state.connected ? "on" : "off");
    $("conn-text").textContent = state.stoppedReason
      ? "Stopped"
      : state.running
        ? (state.connected ? "Connected" : "Trying to reach the website…")
        : "Not started";

    if (state.stationName) {
      $("station-pill").hidden = false;
      $("station-pill").textContent = state.stationName;
    }

    $("s-queued").textContent = state.queued ?? 0;
    $("s-printed").textContent = state.printed ?? 0;
    $("s-failed").textContent = state.failed ?? 0;

    const problem = state.stoppedReason || state.lastError || (state.problems || [])[0] || "";
    $("problem").hidden = !problem;
    $("problem").textContent = problem;

    if (!loadedOnce) {
      $("agentToken").value = state.config.agentToken || "";
      $("serverUrl").value = state.config.serverUrl || "";
      $("pollSeconds").value = state.config.pollSeconds || 5;
      $("duplex").checked = !!state.config.duplex;

      const select = $("printerName");
      select.innerHTML = "";
      const names = state.printers && state.printers.length ? state.printers : [];
      if (!names.length) {
        select.appendChild(new Option("No printer found on this computer", ""));
      }
      for (const name of names) {
        const option = new Option(name, name);
        if (name === state.config.printerName) option.selected = true;
        select.appendChild(option);
      }
      loadedOnce = true;
    }

    $("log").innerHTML = (state.log || [])
      .map((line) => '<div class="' + line.level + '">' +
        new Date(line.at).toLocaleTimeString() + " &nbsp; " +
        line.message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])) + "</div>")
      .join("");
  }

  async function refresh() {
    try { paint(await (await fetch("/api/state")).json()); } catch {}
  }

  $("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("save").disabled = true;
    const body = {
      agentToken: $("agentToken").value,
      printerName: $("printerName").value,
      serverUrl: $("serverUrl").value,
      pollSeconds: Number($("pollSeconds").value),
      duplex: $("duplex").checked,
    };
    try {
      const response = await fetch("/api/save", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = await response.json();
      if (json.problems && json.problems.length) alert(json.problems.join("\\n"));
    } finally {
      $("save").disabled = false;
      refresh();
    }
  });

  $("check").addEventListener("click", async () => {
    $("check").disabled = true;
    $("check").textContent = "Check kar rahe hain…";
    try {
      const json = await (await fetch("/api/check", { method: "POST" })).json();
      const box = $("findings");
      box.hidden = false;
      const label = { ok: "Theek", error: "Gadbad", warn: "Dhyan", fix: "Ye kariye", info: "" };
      box.innerHTML = (json.findings || [])
        .map((f) => '<div class="finding ' + f.level + '"><span class="tag">' +
          (label[f.level] || "") + '</span><span>' +
          f.text.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])) + "</span></div>")
        .join("");
    } catch {
      alert("Check nahi ho paya. Kya ye program abhi bhi chal raha hai?");
    } finally {
      $("check").disabled = false;
      $("check").textContent = "Kya galat hai? Check kijiye";
      refresh();
    }
  });

  $("test").addEventListener("click", async () => {
    $("test").disabled = true;
    try {
      const json = await (await fetch("/api/test-print", { method: "POST" })).json();
      alert(json.ok ? "Sent to " + json.printer + ". Check the tray." : (json.error || "Could not print."));
    } finally {
      $("test").disabled = false;
      refresh();
    }
  });

  refresh();
  setInterval(refresh, 2000);
</script>
</body>
</html>`;
}
