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
      right: "20px",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      maxWidth: "360px",
      width: "calc(100% - 40px)",
      pointerEvents: "none",
    });
    document.body.appendChild(el);
  }
  return el;
}

// Minimal check/cross glyph. Colored icon carries the meaning, the card stays neutral.
function iconSvg(kind: "success" | "error"): string {
  return kind === "success"
    ? `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 11.7L13 4.5" stroke="${colors.success}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="${colors.danger}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function showToast(
  text: string,
  kind: "success" | "error",
  timeoutMs: number,
): void {
  const iconBg = kind === "success" ? colors.successSoft : colors.dangerSoft;

  const toast = document.createElement("div");
  toast.setAttribute("role", "alert");
  Object.assign(toast.style, {
    pointerEvents: "auto",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: `${radius.md}px`,
    padding: "12px 14px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.04)",
    font: `500 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    color: colors.text,
    opacity: "0",
    transform: "translateY(6px) scale(0.98)",
    transition: "opacity 160ms ease, transform 160ms ease",
  });

  const iconEl = document.createElement("div");
  Object.assign(iconEl.style, {
    flexShrink: "0",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: iconBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });
  iconEl.innerHTML = iconSvg(kind);

  const textEl = document.createElement("div");
  textEl.textContent = text;

  toast.appendChild(iconEl);
  toast.appendChild(textEl);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    Object.assign(toast.style, {
      opacity: "0",
      transform: "translateY(6px) scale(0.98)",
    });
    window.setTimeout(() => toast.remove(), 160);
  };
  toast.addEventListener("click", dismiss);
  getContainer().appendChild(toast);

  // Next frame so the transition from the initial (hidden) state actually animates.
  window.requestAnimationFrame(() => {
    Object.assign(toast.style, { opacity: "1", transform: "translateY(0) scale(1)" });
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
