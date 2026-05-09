// Apple-compliant parental gate: hold the highlighted number for 2 seconds.
// Returns a promise that resolves true on success, false on cancel.

export function runParentalGate() {
  return new Promise((resolve) => {
    const tpl = document.getElementById("tpl-parental-gate").content.cloneNode(true);
    const dialog = document.createElement("dialog");
    dialog.className = "parental-gate";
    dialog.appendChild(tpl);
    document.body.appendChild(dialog);

    const target = 1 + Math.floor(Math.random() * 9);
    dialog.querySelector("[data-target]").textContent = target;

    const grid = dialog.querySelector(".gate-grid");
    let holdTimer = null;
    let holdStart = 0;
    let resolved = false;

    function done(ok) {
      if (resolved) return;
      resolved = true;
      try { dialog.close(); } catch (_) {}
      dialog.remove();
      resolve(ok);
    }

    for (let n = 1; n <= 9; n++) {
      const b = document.createElement("button");
      b.className = "gate-num" + (n === target ? " target" : "");
      b.textContent = n;
      b.setAttribute("aria-label", String(n));
      const ring = document.createElement("span");
      ring.className = "ring";
      b.appendChild(ring);

      if (n === target) {
        const start = (e) => {
          e.preventDefault();
          if (holdTimer) return;
          b.classList.add("holding");
          holdStart = performance.now();
          const tick = () => {
            const elapsed = performance.now() - holdStart;
            const pct = Math.min(1, elapsed / 2000);
            ring.style.clipPath = `inset(0 ${(1 - pct) * 100}% 0 0)`;
            if (pct >= 1) { clearInterval(holdTimer); holdTimer = null; done(true); }
          };
          holdTimer = setInterval(tick, 16);
        };
        const cancel = () => {
          if (holdTimer) { clearInterval(holdTimer); holdTimer = null; }
          b.classList.remove("holding");
          ring.style.clipPath = "";
        };
        b.addEventListener("pointerdown", start);
        b.addEventListener("pointerup", cancel);
        b.addEventListener("pointerleave", cancel);
        b.addEventListener("pointercancel", cancel);
      } else {
        b.addEventListener("click", (e) => e.preventDefault());
      }
      grid.appendChild(b);
    }

    dialog.querySelector("[data-action='cancel']").addEventListener("click", () => done(false));
    dialog.addEventListener("cancel", () => done(false));

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
}
