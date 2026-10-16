import { ApiWidget } from "./ApiWidget.js";

export class FactOfDayWidget extends ApiWidget {
  constructor(id, { data, collapsed } = {}) {
    super(id, "Факт дня", {
      type: "fact",
      subtitle: "Немного бесполезных знаний",
      icon: "✦",
      collapsed,
      data
    });
  }

  buildUrl() {
    return "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en";
  }

  parse(payload) {
    const text = payload?.text ?? payload?.fact ?? payload?.data?.text;
    if (typeof text !== "string" || !text.trim()) {
      throw this.friendlyError("Сервис не прислал факт. Нажми «Повторить».");
    }
    return { text: text.trim() };
  }

  renderResult({ text }, container) {
    const paragraph = document.createElement("p");
    paragraph.className = "api-text";
    paragraph.textContent = text;
    container.append(paragraph);
  }
}
