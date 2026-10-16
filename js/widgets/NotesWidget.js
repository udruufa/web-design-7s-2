import { UIComponent } from "../ui-component.js";

/** Заметки: свободный текст с автосохранением. */
export class NotesWidget extends UIComponent {
  constructor(id, { data, collapsed } = {}) {
    super(id, "Заметки", {
      type: "notes",
      subtitle: "Сохраняй важное",
      icon: "✎",
      collapsed,
      data
    });

    if (typeof this.data.text !== "string") this.data.text = "";
  }

  renderBody(body) {
    const idleText = "Изменения сохраняются автоматически.";

    const area = document.createElement("textarea");
    area.className = "text-area";
    area.placeholder = "Запиши мысль, идею или напоминание…";
    area.setAttribute("aria-label", "Текст заметки");
    area.value = this.data.text;

    const status = document.createElement("p");
    status.className = "note-status";
    status.textContent = idleText;

    body.append(area, status);

    let resetTimer = null;
    this.listen(area, "input", () => {
      this.data.text = area.value;
      this.persist();
      status.textContent = "Сохранено";

      this.clearTimer(resetTimer);
      resetTimer = this.setTimer(() => {
        status.textContent = idleText;
      }, 1300);
    });
  }
}
