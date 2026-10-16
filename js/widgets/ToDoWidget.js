import { UIComponent } from "../ui-component.js";

/** Список дел: добавление, отметка выполнения, удаление. */
export class ToDoWidget extends UIComponent {
  constructor(id, { data, collapsed } = {}) {
    super(id, "Список дел", {
      type: "tasks",
      subtitle: "Один шаг за раз",
      icon: "✓",
      collapsed,
      data
    });

    // Защита от повреждённых сохранённых данных.
    this.data.tasks = Array.isArray(this.data.tasks)
      ? this.data.tasks.filter(task => task && typeof task.text === "string" && task.id != null)
      : [];
  }

  renderBody(body) {
    const form = document.createElement("form");
    form.className = "field";
    form.innerHTML = `<input class="text-input" name="task" placeholder="Что нужно сделать?" maxlength="180" aria-label="Новая задача" required><button class="button button-primary" type="submit">Добавить</button>`;

    const summary = document.createElement("p");
    summary.className = "note-status";

    const list = document.createElement("ul");
    list.className = "list";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Пока пусто. Добавь первую задачу.";

    body.append(form, summary, list, empty);

    const draw = () => {
      if (this.destroyed) return;
      const tasks = this.data.tasks;
      list.replaceChildren();
      empty.hidden = tasks.length > 0;

      const doneCount = tasks.filter(task => task.done).length;
      summary.textContent = tasks.length ? `Выполнено ${doneCount} из ${tasks.length}` : "";

      for (const task of tasks) {
        const li = document.createElement("li");
        li.className = `list-item${task.done ? " done" : ""}`;
        li.dataset.id = task.id;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "check-input";
        checkbox.checked = Boolean(task.done);
        checkbox.setAttribute("aria-label", `Выполнено: ${task.text}`);

        const text = document.createElement("span");
        text.className = "item-text";
        text.textContent = task.text;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-item";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `Удалить задачу ${task.text}`);

        li.append(checkbox, text, remove);
        list.append(li);
      }
    };

    this.listen(form, "submit", event => {
      event.preventDefault();
      const input = form.elements.task;
      const text = input.value.trim();
      if (!text) return;

      this.data.tasks.push({ id: this.makeItemId(), text, done: false });
      input.value = "";
      this.persist();
      draw();
      input.focus();
    });

    // Один обработчик на весь список вместо десятков на каждую перерисовку.
    this.listen(list, "change", event => {
      const checkbox = event.target.closest(".check-input");
      const id = checkbox?.closest("li")?.dataset.id;
      const task = this.data.tasks.find(item => String(item.id) === id);
      if (!task) return;

      task.done = checkbox.checked;
      this.persist();
      draw();
    });

    this.listen(list, "click", event => {
      const button = event.target.closest(".remove-item");
      const id = button?.closest("li")?.dataset.id;
      if (!id) return;

      this.data.tasks = this.data.tasks.filter(item => String(item.id) !== id);
      this.persist();
      draw();
    });

    draw();
  }
}
