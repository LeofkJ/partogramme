import { colors, radius } from "../theme";
import type { Notify } from "./notifyTypes";

// Web implementation: lightweight DOM toasts, no dependencies.
// react-native-web renders into the DOM, so document is always available here.
// The project's tsconfig has no "dom" lib (React Native), hence the declares.
declare const document: any;
declare const window: any;

const CONTAINER_ID = "pg-notify-container";

function getContainer(): any {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = CONTAINER_ID;
    Object.assign(el.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      maxWidth: "360px",
      width: "calc(100% - 40px)",
      pointerEvents: "none",
    });
    document.body.appendChild(el);
  }
  return el;
}

// Success gets a minimal checkmark (no circle badge); error stays a plain
// dot — kept intentionally asymmetric since a bold "X" read as too loud.
const CHECK_SVG = (color: string) =>
  `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.7L13 4.5" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function showToast(
  text: string,
  kind: "success" | "error",
  timeoutMs: number,
): void {
  const dotColor = kind === "success" ? colors.success : colors.danger;

  const toast = document.createElement("div");
  toast.setAttribute("role", "alert");
  Object.assign(toast.style, {
    pointerEvents: "auto",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    padding: "10px 13px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
    font: `450 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    color: colors.text,
    opacity: "0",
    transform: "translateY(-4px)",
    transition: "opacity 140ms ease, transform 140ms ease",
  });

  const dotEl = document.createElement("div");
  if (kind === "success") {
    Object.assign(dotEl.style, { flexShrink: "0", display: "flex" });
    dotEl.innerHTML = CHECK_SVG(dotColor);
  } else {
    Object.assign(dotEl.style, {
      flexShrink: "0",
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      background: dotColor,
    });
  }

  const textEl = document.createElement("div");
  textEl.textContent = text;

  toast.appendChild(dotEl);
  toast.appendChild(textEl);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    Object.assign(toast.style, {
      opacity: "0",
      transform: "translateY(-4px)",
    });
    window.setTimeout(() => toast.remove(), 140);
  };
  toast.addEventListener("click", dismiss);
  getContainer().appendChild(toast);

  // Next frame so the transition from the initial (hidden) state actually animates.
  window.requestAnimationFrame(() => {
    Object.assign(toast.style, { opacity: "1", transform: "translateY(0)" });
  });

  window.setTimeout(dismiss, timeoutMs);
}

export const notify: Notify = {
  error(title, message) {
    showToast(message ? `${title}: ${message}` : title, "error", 5000);
  },

  success(message) {
    showToast(message, "success", 3000);
  },

  confirm({ title, message }) {
    return Promise.resolve(
      window.confirm(title ? `${title}\n\n${message}` : message),
    );
  },
};
