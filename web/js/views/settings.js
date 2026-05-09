// Settings — gated behind the parental gate. Toggles for music, SFX, voice,
// autosave, color-blind palette, plus a destructive "delete all saved pages".

import { settings } from "../db.js";
import { Audio } from "../audio.js";
import { Gallery } from "../db.js";
import { runParentalGate } from "./parental-gate.js";

export function mountSettingsView(host, { onBack }) {
  const tpl = document.getElementById("tpl-settings").content.cloneNode(true);
  host.replaceChildren(tpl);
  host.querySelector("[data-action='back']").addEventListener("click", onBack);
  const form = host.querySelector(".settings-form");
  renderLocked(form);

  async function renderLocked(into) {
    into.replaceChildren();
    const pane = document.createElement("div");
    pane.className = "locked-pane";
    pane.innerHTML = `
      <div class="gate-icon">🔒</div>
      <h2>Settings are for grown-ups</h2>
    `;
    const btn = document.createElement("button");
    btn.className = "big-btn";
    btn.textContent = "Unlock";
    btn.addEventListener("click", async () => {
      const ok = await runParentalGate();
      if (ok) renderForm(into);
    });
    pane.appendChild(btn);
    into.appendChild(pane);
  }

  function renderForm(into) {
    into.replaceChildren();
    section(into, "Audio", [
      toggleRow("Background music", "musicEnabled", () => Audio.startBackgroundMusicIfEnabled(), () => Audio.stopBackgroundMusic()),
      toggleRow("Sound effects", "sfxEnabled"),
      toggleRow("Voice prompts (color & category names)", "voiceoverEnabled"),
    ]);
    section(into, "Drawing", [
      toggleRow("Autosave my coloring", "autosaveEnabled"),
      toggleRow("Color-blind friendly palette", "colorBlindPalette"),
    ]);
    section(into, "Data", [
      destructiveRow("Delete all saved pages", async () => {
        if (!confirm("Delete every saved page?")) return;
        await Gallery.clearAll();
        alert("All pages deleted.");
      })
    ]);
    section(into, "About", [
      infoRow("Version", "1.0.0"),
      noteRow("Greedy Cookie does not collect any data, show ads, or connect to the internet after installing.")
    ]);
  }
}

function section(parent, title, rows) {
  const h = document.createElement("h3");
  h.textContent = title;
  h.style.margin = "16px 4px 4px";
  parent.appendChild(h);
  for (const r of rows) parent.appendChild(r);
}

function toggleRow(label, key, onTrue, onFalse) {
  const row = document.createElement("label");
  row.className = "setting-row";
  const span = document.createElement("span");
  span.textContent = label;
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!settings[key];
  cb.addEventListener("change", () => {
    settings[key] = cb.checked;
    if (cb.checked && onTrue) onTrue();
    if (!cb.checked && onFalse) onFalse();
  });
  row.appendChild(span);
  row.appendChild(cb);
  return row;
}
function destructiveRow(label, action) {
  const row = document.createElement("div");
  row.className = "setting-row danger";
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.addEventListener("click", action);
  row.appendChild(btn);
  return row;
}
function infoRow(label, value) {
  const row = document.createElement("div");
  row.className = "setting-row";
  row.innerHTML = `<label>${label}</label><span>${value}</span>`;
  return row;
}
function noteRow(text) {
  const row = document.createElement("p");
  row.style.cssText = "color: var(--c-muted); font-size: 14px; margin: 8px 4px;";
  row.textContent = text;
  return row;
}
