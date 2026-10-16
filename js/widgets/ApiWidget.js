import { UIComponent } from "../ui-component.js";

export class ApiWidget extends UIComponent {
  constructor(id, title, { timeoutMs = 10000, ...options }) {
    super(id, title, options);
    this.timeoutMs = timeoutMs;

    this.requestId = 0;
    this.requestController = null;

    this.result = null;
    this.status = null;
    this.retryButton = null;
  }

  buildUrl() {
    throw new Error("buildUrl() не реализован");
  }

  parse(payload) {
    return payload;
  }

  renderResult(_model, _container) { }

  renderBody(body) {
    const result = document.createElement("div");
    result.className = "api-result";

    const status = document.createElement("p");
    status.className = "api-status";
    status.setAttribute("role", "status");

    const footer = document.createElement("div");
    footer.className = "api-footer";

    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "button button-secondary";
    retry.textContent = "Обновить";

    footer.append(retry);
    body.append(result, status, footer);

    this.result = result;
    this.status = status;
    this.retryButton = retry;

    this.listen(retry, "click", () => this.load());
    this.load();
  }

  async load() {
    if (this.destroyed) return;

    // Новый запрос отменяет предыдущий, а устаревший ответ игнорируется.
    const requestId = ++this.requestId;
    this.requestController?.abort();
    const controller = new AbortController();
    this.requestController = controller;

    let timedOut = false;
    const timer = this.setTimer(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    this.showLoading();

    try {
      if (!navigator.onLine) {
        throw this.friendlyError("Нет подключения к интернету. Проверь соединение и нажми «Повторить».");
      }

      const response = await fetch(this.buildUrl(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });

      if (!response.ok) {
        throw this.friendlyError(`Сервис ответил ошибкой (${response.status}). Попробуй позже.`);
      }

      const payload = await response.json();
      const model = this.parse(payload);

      if (this.destroyed || requestId !== this.requestId) return;
      this.showResult(model);
    } catch (error) {
      if (this.destroyed || requestId !== this.requestId) return;
      this.showError(this.describeError(error, timedOut));
    } finally {
      this.clearTimer(timer);
    }
  }

  friendlyError(message) {
    const error = new Error(message);
    error.friendly = true;
    return error;
  }

  describeError(error, timedOut) {
    if (error?.friendly) return error.message;
    if (error?.name === "AbortError") {
      return timedOut
        ? "Сервис не ответил вовремя. Проверь интернет и нажми «Повторить»."
        : "Запрос был отменён.";
    }
    if (error instanceof TypeError) {
      return "Не удалось подключиться к сервису. Проверь интернет и нажми «Повторить».";
    }
    if (error instanceof SyntaxError) {
      return "Сервис вернул ответ в неожиданном формате. Попробуй ещё раз.";
    }
    return "Не удалось загрузить данные. Попробуй ещё раз.";
  }

  showLoading() {
    this.result.replaceChildren();
    this.result.setAttribute("aria-busy", "true");

    this.status.className = "api-status is-loading";
    this.status.replaceChildren();
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    this.status.append(spinner, document.createTextNode("Загружаем…"));

    this.retryButton.disabled = true;
    this.retryButton.textContent = "Загрузка…";
  }

  showResult(model) {
    this.result.replaceChildren();
    this.result.removeAttribute("aria-busy");

    try {
      this.renderResult(model, this.result);
    } catch (error) {
      console.error(`Не удалось показать результат «${this.title}»:`, error);
      this.showError("Не удалось показать полученные данные. Попробуй ещё раз.");
      return;
    }

    this.status.className = "api-status";
    this.status.textContent = "";
    this.retryButton.disabled = false;
    this.retryButton.textContent = "Обновить";
  }

  showError(message) {
    this.result.replaceChildren();
    this.result.removeAttribute("aria-busy");

    const box = document.createElement("div");
    box.className = "api-error";
    box.setAttribute("role", "alert");
    box.textContent = message;
    this.result.append(box);

    this.status.className = "api-status";
    this.status.textContent = "";
    this.retryButton.disabled = false;
    this.retryButton.textContent = "Повторить";
  }

  destroy() {
    this.requestController?.abort();
    this.requestController = null;
    super.destroy();
  }
}
