import { UIComponent } from "../ui-component.js";

const INPUT_DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

function isoToDate(iso) {
  const match = ISO_DATE_RE.exec(iso);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? date : null;
}

function inputToIso(text) {
  const match = INPUT_DATE_RE.exec(text.trim());
  if (!match) return null;
  const year = Number(match[3]);
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return isoToDate(iso) ? iso : null;
}

function isoToDisplay(iso) {
  const match = ISO_DATE_RE.exec(iso);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
}

function normalizeIso(value) {
  if (typeof value !== "string") return "";
  const iso = value.slice(0, 10);
  return isoToDate(iso) ? iso : "";
}

function maskDigits(digits) {
  let result = digits.slice(0, 2);
  if (digits.length > 2) result += `.${digits.slice(2, 4)}`;
  if (digits.length > 4) result += `.${digits.slice(4, 8)}`;
  return result;
}

const CALENDAR_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>`;

export class CalendarWidget extends UIComponent {
  constructor(id, { data, collapsed } = {}) {
    super(id, "Календарь событий", {
      type: "calendar",
      subtitle: "Держи планы на виду",
      icon: "▦",
      collapsed,
      data
    });

    this.data.events = Array.isArray(this.data.events)
      ? this.data.events
          .filter(item => item && typeof item.title === "string" && item.id != null)
          .map(item => ({ ...item, date: normalizeIso(item.date) }))
      : [];
  }

  renderBody(body) {
    const form = document.createElement("form");
    form.className = "event-form";
    form.innerHTML = `
      <input class="text-input" name="eventTitle" placeholder="Название события" maxlength="140" aria-label="Название события" required>
      <button class="button button-primary" type="submit">Добавить</button>
      <div class="date-field">
        <input class="text-input" name="eventDate" type="text" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="ДД.ММ.ГГГГ" aria-label="Дата события в формате ДД.ММ.ГГГГ">
        <button class="date-picker-btn" type="button" aria-label="Выбрать дату в календаре" title="Выбрать дату в календаре">${CALENDAR_ICON}</button>
        <input class="date-native" type="date" min="${MIN_YEAR}-01-01" max="${MAX_YEAR}-12-31" tabindex="-1" aria-hidden="true">
      </div>
      <p class="field-error" role="alert" hidden></p>`;

    const dateInput = form.elements.eventDate;
    const pickerButton = form.querySelector(".date-picker-btn");
    const nativeDate = form.querySelector(".date-native");
    const errorBox = form.querySelector(".field-error");

    const list = document.createElement("ul");
    list.className = "list";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Планов пока нет.";

    body.append(form, list, empty);

    const showError = message => {
      errorBox.textContent = message;
      errorBox.hidden = false;
      dateInput.classList.add("is-invalid");
      dateInput.setAttribute("aria-invalid", "true");
    };

    const clearError = () => {
      errorBox.hidden = true;
      errorBox.textContent = "";
      dateInput.classList.remove("is-invalid");
      dateInput.removeAttribute("aria-invalid");
    };

    const draw = () => {
      if (this.destroyed) return;
      list.replaceChildren();

      const events = [...this.data.events].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
      empty.hidden = events.length > 0;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      for (const item of events) {
        const date = item.date ? isoToDate(item.date) : null;
        const time = date ? date.getTime() : null;

        const li = document.createElement("li");
        li.className = `list-item${time !== null && time < todayStart ? " is-past" : ""}`;
        li.dataset.id = item.id;

        const chip = document.createElement("span");
        chip.className = `event-date${time === todayStart ? " is-today" : ""}${date ? "" : " is-empty"}`;
        chip.textContent = date ? isoToDisplay(item.date) : "без даты";

        const content = document.createElement("div");
        content.className = "item-text";
        content.textContent = item.title;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-item";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `Удалить событие ${item.title}`);

        li.append(chip, content, remove);
        list.append(li);
      }
    };

    this.listen(dateInput, "input", () => {
      clearError();

      const raw = dateInput.value;
      const caret = dateInput.selectionStart ?? raw.length;
      const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, "").length;
      const formatted = maskDigits(raw.replace(/\D/g, ""));

      if (formatted !== raw) {
        dateInput.value = formatted;
        let position = 0;
        let seen = 0;
        while (position < formatted.length && seen < digitsBeforeCaret) {
          if (/\d/.test(formatted[position])) seen += 1;
          position += 1;
        }
        dateInput.setSelectionRange(position, position);
      }

      nativeDate.value = inputToIso(formatted) || "";
    });

    // Вставка даты в формате ГГГГ-ММ-ДД превращается в ДД.ММ.ГГГГ.
    this.listen(dateInput, "paste", event => {
      const text = event.clipboardData?.getData("text")?.trim() || "";
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
      if (!match) return;
      event.preventDefault();
      dateInput.value = `${match[3]}.${match[2]}.${match[1]}`;
      dateInput.dispatchEvent(new Event("input"));
    });

    this.listen(pickerButton, "click", () => {
      nativeDate.value = inputToIso(dateInput.value) || "";
      try {
        nativeDate.showPicker();
      } catch {
        nativeDate.focus();
        nativeDate.click();
      }
    });

    this.listen(nativeDate, "change", () => {
      if (!nativeDate.value) return;
      dateInput.value = isoToDisplay(nativeDate.value);
      clearError();
    });

    this.listen(form, "submit", event => {
      event.preventDefault();
      const title = form.elements.eventTitle.value.trim();
      if (!title) return;

      let date = "";
      const typed = dateInput.value.trim();
      if (typed) {
        date = inputToIso(typed);
        if (!date) {
          showError(`Введи существующую дату в формате ДД.ММ.ГГГГ (годы ${MIN_YEAR}–${MAX_YEAR}).`);
          dateInput.focus();
          return;
        }
      }

      this.data.events.push({ id: this.makeItemId(), title, date });
      form.reset();
      nativeDate.value = "";
      clearError();
      this.persist();
      draw();
    });

    this.listen(list, "click", event => {
      const button = event.target.closest(".remove-item");
      const id = button?.closest("li")?.dataset.id;
      if (!id) return;

      this.data.events = this.data.events.filter(item => String(item.id) !== id);
      this.persist();
      draw();
    });

    draw();
  }
}
