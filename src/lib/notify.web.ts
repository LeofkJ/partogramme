import { colors } from "../theme";
import type { Notify } from "./notifyTypes";

// Web implementation: lightweight DOM banners, no dependencies.
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
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      maxWidth: "480px",
      width: "calc(100% - 32px)",
      pointerEvents: "none",
    });
    document.body.appendChild(el);
  }
  return el;
}

function showBanner(
  text: string,
  fg: string,
  bg: string,
  timeoutMs: number,
): void {
  const banner = document.createElement("div");
  banner.setAttribute("role", "alert");
  banner.textContent = text;
  Object.assign(banner.style, {
    pointerEvents: "auto",
    cursor: "pointer",
    background: bg,
    color: fg,
    borderLeft: `3px solid ${fg}`,
    borderRadius: "6px",
    padding: "12px 16px",
    font: `500 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
  });
  const dismiss = () => banner.remove();
  banner.addEventListener("click", dismiss);
  getContainer().appendChild(banner);
  window.setTimeout(dismiss, timeoutMs);
}

export const notify: Notify = {
  error(title, message) {
    showBanner(
      message ? `${title} — ${message}` : title,
      colors.danger,
      colors.dangerSoft,
      6000,
    );
  },

  success(_message) {
    // Quiet on web, like iOS: success is the default outcome and announces
    // itself (navigation, updated data). Only errors get a banner.
  },

  confirm({ title, message }) {
    return Promise.resolve(
      window.confirm(title ? `${title}\n\n${message}` : message),
    );
  },
};
