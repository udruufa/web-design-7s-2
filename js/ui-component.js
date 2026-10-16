export class UIComponent {
  /**
   * @param {string} id     Уникальный id карточки.
   * @param {string} title  Заголовок карточки.
   * @param {object} [options]
   * @param {string} [options.type]       Тип виджета (для сохранения).
   * @param {string} [options.subtitle]   Подпись под заголовком.
   * @param {string} [options.icon]       Символ в иконке карточки.
   * @param {boolean} [options.collapsed] Свёрнута ли карточка.
   * @param {object} [options.data]       Сохранённые данные виджета.
   */
  constructor(id, title, { type = "", subtitle = "", icon = "◇", collapsed = false, data = {} } = {}) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.subtitle = subtitle;
    this.icon = icon;
    this.collapsed = Boolean(collapsed);
    this.data = data && typeof data === "object" && !Array.isArray(data) ? data : {};

    this.element = null;
    this.body = null;
    this.dashboard = null;
    this.abortController = new AbortController();
    this.timers = new Set();
    this.destroyed = false;
  }

  listen(target, eventName, handler, options = {}) {
    if (this.destroyed || !target) return;
    target.addEventListener(eventName, handler, {
      ...options,
      signal: this.abortController.signal
    });
  }

  setTimer(callback, delay) {
    if (this.destroyed) return null;
    const timerId = window.setTimeout(() => {
      this.timers.delete(timerId);
      if (!this.destroyed) callback();
    }, delay);
    this.timers.add(timerId);
    return timerId;
  }

  clearTimer(timerId) {
    if (timerId == null) return;
    window.clearTimeout(timerId);
    this.timers.delete(timerId);
  }

  render(dashboard) {
    this.dashboard = dashboard;
    this.destroyed = false;

    const card = document.createElement("article");
    card.className = `widget-card${this.collapsed ? " is-collapsed" : ""}`;
    card.dataset.widgetId = this.id;

    const header = document.createElement("header");
    header.className = "widget-header";

    const heading = document.createElement("div");
    heading.className = "widget-heading";

    const icon = document.createElement("div");
    icon.className = "widget-icon";
    icon.textContent = this.icon;

    const text = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "widget-title";
    title.textContent = this.title;

    const subtitle = document.createElement("p");
    subtitle.className = "widget-kicker";
    subtitle.textContent = this.subtitle;

    text.append(title, subtitle);
    heading.append(icon, text);

    const actions = document.createElement("div");
    actions.className = "widget-actions";
    actions.append(
      this.makeAction("collapse", this.collapsed ? "＋" : "−", this.collapsed ? "Развернуть" : "Свернуть"),
      this.makeAction("delete", "×", "Удалить виджет", true)
    );

    header.append(heading, actions);

    const body = document.createElement("div");
    body.className = "widget-body";

    this.element = card;
    this.body = body;
    card.append(header, body);

    try {
      this.renderBody(body);
    } catch (error) {
      console.error(`Ошибка в виджете «${this.title}»:`, error);
      this.renderFailure(body);
    }

    return card;
  }

  makeAction(action, symbol, label, isDelete = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon-button${isDelete ? " delete" : ""}`;
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = symbol;

    this.listen(button, "click", () => {
      if (action === "delete") this.dashboard?.removeWidget(this.id);
      if (action === "collapse") this.dashboard?.toggleCollapsed(this.id);
    });

    return button;
  }

  renderBody(_container) { }

  renderFailure(container) {
    const box = document.createElement("div");
    box.className = "api-error";
    box.textContent = "Этот виджет не смог отобразиться. Остальные карточки работают как обычно — удали его и добавь заново.";
    container.replaceChildren(box);
  }

  refreshCollapsed() {
    if (!this.element) return;
    this.element.classList.toggle("is-collapsed", this.collapsed);

    const button = this.element.querySelector('[data-action="collapse"]');
    if (button) {
      button.textContent = this.collapsed ? "＋" : "−";
      button.title = this.collapsed ? "Развернуть" : "Свернуть";
      button.setAttribute("aria-label", button.title);
    }
  }

  persist() {
    this.dashboard?.setData(this.id, this.data);
  }

  makeItemId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.abortController.abort();

    for (const timerId of this.timers) {
      window.clearTimeout(timerId);
    }
    this.timers.clear();

    this.element?.remove();
    this.element = null;
    this.body = null;
    this.dashboard = null;
  }
}
