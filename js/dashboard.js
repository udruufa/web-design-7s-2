import { createWidget, hasWidgetType } from "./widgets.js";

const STORAGE_KEY = "zhestko-dashboard-v1";

const LEGACY_TYPES = { meme: "quiz" };

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function defaultState() {
  return {
    widgets: [
      { id: "demo-tasks", type: "tasks" },
      { id: "demo-calendar", type: "calendar" },
      { id: "demo-notes", type: "notes" },
      { id: "demo-word", type: "word" },
      { id: "demo-fact", type: "fact" },
      { id: "demo-quiz", type: "quiz" }
    ],
    data: {
      "demo-tasks": { tasks: [{ id: "t1", text: "Разобраться с главным приоритетом", done: false }, { id: "t2", text: "Сделать первый маленький шаг", done: true }] },
      "demo-calendar": { events: [{ id: "e1", title: "Запланировать неделю", date: "" }] },
      "demo-notes": { text: "Не обязательно делать всё сразу.\nВажно продолжать." }
    },
    collapsed: {}
  };
}

export class Dashboard {
  /**
   * @param {object} options
   * @param {HTMLElement} options.grid        Контейнер сетки карточек.
   * @param {HTMLElement} options.countLabel  Подпись «N виджетов».
   * @param {(message: string) => void} options.toast  Показ подсказок.
   * @param {(activeTypes: Set<string>) => void} [options.onChange]
   *        Вызывается после любого изменения набора виджетов.
   */
  constructor({ grid, countLabel, toast, onChange = null }) {
    this.grid = grid;
    this.countLabel = countLabel;
    this.toast = toast;
    this.onChange = onChange;
    this.widgets = new Map(); // id → виджет
    this.order = [];
    this.state = this.loadState();
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isPlainObject(parsed) && Array.isArray(parsed.widgets)) {
          const seenTypes = new Set();
          const widgets = [];
          for (const item of parsed.widgets) {
            if (!isPlainObject(item) || typeof item.id !== "string") continue;
            const type = LEGACY_TYPES[item.type] ?? item.type;

            if (!hasWidgetType(type) || seenTypes.has(type)) continue;
            seenTypes.add(type);
            widgets.push({ id: item.id, type });
          }
          return {
            widgets,
            data: isPlainObject(parsed.data) ? parsed.data : {},
            collapsed: isPlainObject(parsed.collapsed) ? parsed.collapsed : {}
          };
        }
      }
    } catch (error) {
      console.warn("Не удалось прочитать сохранённую панель:", error);
    }
    return defaultState();
  }

  saveState() {
    try {
      const data = {
        widgets: this.order.map(id => ({ id, type: this.widgets.get(id)?.type })).filter(item => item.type),
        data: this.state.data,
        collapsed: this.state.collapsed
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Не удалось сохранить панель:", error);
      this.toast("Не удалось сохранить данные в браузере.");
    }
  }

  mount() {
    this.grid.replaceChildren();
    for (const descriptor of this.state.widgets) {
      this.addWidget(descriptor.type, { id: descriptor.id, persist: false });
    }
    this.refreshUi();
    this.saveState();
  }

  findByType(type) {
    for (const widget of this.widgets.values()) {
      if (widget.type === type) return widget;
    }
    return null;
  }

  activeTypes() {
    return new Set([...this.widgets.values()].map(widget => widget.type));
  }

  /**
   * @returns {object|null} созданный виджет или null
   */
  addWidget(type, { id = this.makeId(), persist = true } = {}) {
    if (!hasWidgetType(type)) {
      this.toast("Неизвестный тип виджета.");
      return null;
    }

    const existing = this.findByType(type);
    if (existing) {
      if (persist) this.announceDuplicate(existing);
      return null;
    }
    if (this.widgets.has(id)) return null;

    let widget = null;
    try {
      widget = createWidget(type, {
        id,
        data: this.state.data[id] || {},
        collapsed: Boolean(this.state.collapsed[id])
      });

      const card = widget.render(this);
      this.widgets.set(id, widget);
      this.order.push(id);
      this.grid.append(card);
    } catch (error) {
      console.error("Ошибка при создании виджета:", type, error);
      widget?.destroy();
      this.widgets.delete(id);
      this.order = this.order.filter(item => item !== id);
      this.toast("Не удалось создать виджет.");
      return null;
    }

    if (persist) {
      this.saveState();
      this.toast(`Добавлен виджет «${widget.title}».`);
    }
    this.refreshUi();
    return widget;
  }

  announceDuplicate(widget) {
    const hint = widget.collapsed ? " Он свёрнут — разверни его кнопкой «＋»." : "";
    this.toast(`«${widget.title}» уже на панели — каждый виджет можно добавить только один раз.${hint}`);

    const card = widget.element;
    if (!card) return;
    card.classList.remove("is-highlight");
    void card.offsetWidth;
    card.classList.add("is-highlight");
    card.addEventListener("animationend", () => card.classList.remove("is-highlight"), { once: true });
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /**
   * @returns {boolean} true, если виджет был найден и удалён
   */
  removeWidget(id) {
    const widget = this.widgets.get(id);
    if (!widget) return false;
    const title = widget.title;

    try {
      widget.destroy();
    } catch (error) {
      console.error("Ошибка при удалении виджета:", error);
    }

    this.widgets.delete(id);
    this.order = this.order.filter(item => item !== id);
    delete this.state.data[id];
    delete this.state.collapsed[id];
    this.saveState();
    this.refreshUi();
    this.toast(`Виджет «${title}» удалён.`);
    return true;
  }

  toggleCollapsed(id) {
    const widget = this.widgets.get(id);
    if (!widget) return;
    widget.collapsed = !widget.collapsed;
    this.state.collapsed[id] = widget.collapsed;
    widget.refreshCollapsed();
    this.saveState();
  }

  setData(id, data) {
    this.state.data[id] = data;
    this.saveState();
  }

  refreshUi() {
    try {
      this.onChange?.(this.activeTypes());
    } catch (error) {
      console.error("Ошибка в onChange:", error);
    }
  }

  makeId() {
    return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  reset() {
    if (!confirm("Сбросить панель к шести демонстрационным виджетам? Сохранённые данные этой панели будут удалены.")) return;
    localStorage.removeItem(STORAGE_KEY);
    for (const widget of this.widgets.values()) widget.destroy();
    this.widgets.clear();
    this.order = [];
    this.state = defaultState();
    this.mount();
    this.toast("Панель сброшена.");
  }
}
