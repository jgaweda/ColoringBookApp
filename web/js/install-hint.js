// First-run hint that walks the parent through "Add to Home Screen" so the
// app can run as a fully offline PWA on the kid's iPad. Shown at most once
// per device unless reset.

const KEY = "gc.installHintDismissed";

export function maybeShowInstallHint() {
  if (isStandalone()) return;                  // already installed
  if (localStorage.getItem(KEY) === "1") return;
  // Beforeinstallprompt path (Chrome / Edge / Android)
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    showHint({ deferred });
  });
  // iOS Safari has no beforeinstallprompt; show the manual hint after a beat.
  if (isIOS() && isSafari()) {
    setTimeout(() => showHint({ deferred: null, ios: true }), 1500);
  }
}

function showHint({ deferred, ios = false }) {
  const banner = document.createElement("aside");
  banner.className = "install-hint";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Install Greedy Cookie");
  banner.innerHTML = `
    <div class="install-hint__copy">
      <strong>Make it offline 🍪</strong>
      <p>${ios
        ? `Tap the <span class="ios-share">⬆︎</span> Share button, then <em>Add to Home Screen</em> so it runs without internet.`
        : `Install Greedy Cookie on this device so it runs offline forever.`}</p>
    </div>
    <div class="install-hint__actions">
      ${deferred ? `<button class="install-hint__btn primary" data-act="install">Install</button>` : ""}
      <button class="install-hint__btn" data-act="dismiss">Got it</button>
    </div>
  `;
  document.body.appendChild(banner);

  banner.querySelector("[data-act='dismiss']").addEventListener("click", () => {
    localStorage.setItem(KEY, "1");
    banner.remove();
  });
  const installBtn = banner.querySelector("[data-act='install']");
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      try {
        deferred.prompt();
        await deferred.userChoice;
      } catch (_) {}
      localStorage.setItem(KEY, "1");
      banner.remove();
    });
  }
}

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isSafari() {
  const ua = navigator.userAgent;
  return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
}
