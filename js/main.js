import { Dashboard } from "./dashboard.js";

const grid = document.querySelector("#widget-grid");
const countLabel = null;
const toastRegion = document.querySelector("#toast-region");
const addButtons = [...document.querySelectorAll("[data-widget]")];

function toast(message) {
  // Не копим одинаковые подсказки при повторных кликах.
  if ([...toastRegion.children].some(item => item.textContent === message)) return;

  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  toastRegion.append(item);
  window.setTimeout(() => item.remove(), 3200);
}

/** Кнопки типов, которые уже на панели, помечаются «✓ Уже на панели». */
function syncAddButtons(activeTypes) {
  for (const button of addButtons) {
    const added = activeTypes.has(button.dataset.widget);
    button.classList.toggle("is-added", added);
    button.setAttribute("aria-pressed", String(added));
    button.title = added ? "Уже на панели" : "";

    const icon = button.querySelector(".add-icon");
    if (icon) icon.textContent = added ? "✓" : "＋";
  }
}

const dashboard = new Dashboard({ grid, countLabel, toast, onChange: syncAddButtons });
dashboard.mount();

for (const button of addButtons) {
  button.addEventListener("click", () => dashboard.addWidget(button.dataset.widget));
}

document.querySelector("#reset-layout").addEventListener("click", () => dashboard.reset());

const today = new Date();
document.querySelector("#today-label").textContent = today.toLocaleDateString("ru-RU", {
  weekday: "short", day: "numeric", month: "long"
}).toLocaleUpperCase("ru-RU");

window.addEventListener("offline", () => toast("Нет интернета. Сетевые карточки можно повторить позже."));
window.addEventListener("online", () => toast("Соединение восстановлено. Нажми «Повторить» в сетевой карточке."));
