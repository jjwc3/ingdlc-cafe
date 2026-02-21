import { mount } from "svelte";
import App from "./App.svelte";
import "./removeAd.css";

async function init() {
  const targetAnchor = await waitForElement(".game_point");

  if (targetAnchor && !document.getElementById("INGDLC-MOUNT-ROOT")) {
    const container = document.createElement("div");
    container.id = "INGDLC-MOUNT-ROOT";
    container.style.display = "contents";

    targetAnchor.after(container);

    mount(App, {
      target: container,
    });
  }
}

function waitForElement(selector: string): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const target = document.querySelector(selector);
      if (target) {
        observer.disconnect();
        resolve(target);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 10000);
  });
}

await init();