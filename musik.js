"use strict";

const game = document.querySelector(".game");
const button = document.querySelector("#music-button");
const panel = document.querySelector("#music-panel");
const change = document.querySelector("#change-playlist");
const form = document.querySelector("#playlist-form");
const input = document.querySelector("#playlist-link");
const status = document.querySelector("#music-status");
const playerContainer = document.querySelector("#player");
const storageKey = "tierchaos.youtubePlaylist";
const locales = window.TIERCHAOS_LOCALES;
const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);
const openOnYouTube = {
  de: "Auf YouTube öffnen",
  en: "Open on YouTube",
  fr: "Ouvrir sur YouTube",
  es: "Abrir en YouTube",
  it: "Apri su YouTube",
  pt: "Abrir no YouTube",
  ru: "Открыть на YouTube",
  tr: "YouTube’da aç",
};
let language = locales[navigator.language.split("-")[0]] ? navigator.language.split("-")[0] : "en";

function refreshLanguage() {
  const copy = locales[language];
  document.documentElement.lang = language;
  for (const label of document.querySelectorAll("[data-i18n]")) {
    label.textContent = copy[label.dataset.i18n];
  }
  button.textContent = panel.hidden ? copy.music : copy.close_music;
  const directLink = playerContainer.querySelector("a");
  if (directLink) {
    directLink.textContent = openOnYouTube[language];
  }
  if (status.textContent) {
    status.textContent = copy.media_error;
  }
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || event.source !== game.contentWindow || typeof event.data !== "string") {
    return;
  }
  if (event.data.startsWith("tierchaos:language:")) {
    const next = event.data.split(":")[2];
    if (Object.hasOwn(locales, next)) {
      language = next;
      refreshLanguage();
    }
  }
});
refreshLanguage();

function mediaSource(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !youtubeHosts.has(url.hostname)) {
      return null;
    }
    const list = url.searchParams.get("list") ?? "";
    if (/^[A-Za-z0-9_-]{8,100}$/.test(list)) {
      return { type: "playlist", id: list };
    }
    const [, path, pathId] = url.pathname.split("/");
    const id = url.hostname === "youtu.be" ? path : (path === "embed" ? pathId : url.searchParams.get("v"));
    if (/^[A-Za-z0-9_-]{11}$/.test(id ?? "")) {
      return { type: "video", id };
    }
  } catch {
    return null;
  }
  return null;
}

function loadPlayer(media) {
  const url = new URL("https://www.youtube.com/embed");
  if (media.type === "playlist") {
    url.search = new URLSearchParams({listType: "playlist", list: media.id, playsinline: "1", loop: "1"});
  } else {
    url.pathname += "/" + media.id;
    url.search = new URLSearchParams({playsinline: "1", loop: "1", playlist: media.id});
  }
  url.searchParams.set("autoplay", "1");
  const directLink = document.createElement("a");
  const watchUrl = new URL(media.type === "playlist" ? "https://www.youtube.com/playlist" : "https://www.youtube.com/watch");
  watchUrl.searchParams.set(media.type === "playlist" ? "list" : "v", media.id);
  directLink.href = watchUrl.href;
  directLink.target = "_blank";
  directLink.rel = "noopener";
  directLink.textContent = openOnYouTube[language];
  directLink.style.cssText = "display: inline-block; margin-bottom: 8px; color: #d5ec91;";
  const frame = document.createElement("iframe");
  frame.title = locales[language].music;
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.src = url.href;
  playerContainer.replaceChildren(directLink, frame);
  form.hidden = true;
  change.hidden = Boolean(mediaSource(window.TIERCHAOS_YOUTUBE ?? ""));
}

function remembered() {
  if (mediaSource(window.TIERCHAOS_YOUTUBE ?? "")) {
    return window.TIERCHAOS_YOUTUBE;
  }
  try {
    return localStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

button.addEventListener("click", () => {
  panel.hidden = !panel.hidden;
  button.setAttribute("aria-expanded", String(!panel.hidden));
  refreshLanguage();
  if (panel.hidden) {
    playerContainer.replaceChildren();
    status.textContent = "";
    return;
  }
  const saved = remembered();
  const media = mediaSource(saved);
  if (media) {
    input.value = saved;
    loadPlayer(media);
  } else {
    form.hidden = false;
    change.hidden = true;
    input.focus();
  }
});

change.addEventListener("click", () => {
  playerContainer.replaceChildren();
  change.hidden = true;
  form.hidden = false;
  input.focus();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const media = mediaSource(input.value);
  if (!media) {
    status.textContent = locales[language].media_error;
    input.focus();
    return;
  }
  try {
    localStorage.setItem(storageKey, input.value.trim());
  } catch {
    // A browser can allow playback even when local storage is disabled.
  }
  status.textContent = "";
  loadPlayer(media);
});
