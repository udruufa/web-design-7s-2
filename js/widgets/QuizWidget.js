import { ApiWidget } from "./ApiWidget.js";

const DIFFICULTY = { easy: "лёгкий", medium: "средний", hard: "сложный" };

function decode(value) {
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** Викторина: случайный вопрос с вариантами ответа (Open Trivia DB). */
export class QuizWidget extends ApiWidget {
  constructor(id, { data, collapsed } = {}) {
    super(id, "Викторина", {
      type: "quiz",
      subtitle: "Случайный вопрос из Open Trivia DB",
      icon: "?",
      collapsed,
      data
    });
    this.current = null;
  }

  buildUrl() {
    return "https://opentdb.com/api.php?amount=1&encode=url3986";
  }

  parse(payload) {
    if (payload?.response_code === 5) {
      throw this.friendlyError("Open Trivia DB принимает один запрос раз в 5 секунд. Подожди немного и нажми «Повторить».");
    }

    const item = payload?.results?.[0];
    if (payload?.response_code !== 0 || !item) {
      throw this.friendlyError("Сервис не прислал вопрос. Нажми «Повторить».");
    }

    const correct = decode(item.correct_answer);
    const incorrect = (item.incorrect_answers || []).map(decode);

    return {
      category: decode(item.category),
      difficulty: DIFFICULTY[item.difficulty] || decode(item.difficulty),
      question: decode(item.question),
      correct,
      options: item.type === "boolean" ? ["True", "False"] : shuffle([correct, ...incorrect])
    };
  }

  renderBody(body) {
    super.renderBody(body);

    // Один обработчик на контейнер результата — он переживает перерисовки.
    this.listen(this.result, "click", event => {
      const button = event.target.closest(".answer-option");
      if (!button || !this.current || button.disabled) return;

      const chosen = button.dataset.answer;
      const isRight = chosen === this.current.correct;

      for (const option of this.result.querySelectorAll(".answer-option")) {
        option.disabled = true;
        if (option.dataset.answer === this.current.correct) option.classList.add("is-correct");
      }
      if (!isRight) button.classList.add("is-wrong");

      this.status.className = "api-status";
      this.status.textContent = isRight ? "Верно! 🎉" : `Не совсем. Правильный ответ: ${this.current.correct}`;

      // Оставляем результат видимым, затем автоматически загружаем следующий вопрос.
      this.setTimer(() => this.load(), 5000);
    });
  }

  renderResult(model, container) {
    this.current = model;

    const question = document.createElement("p");
    question.className = "api-meme-text";
    question.textContent = model.question;

    const options = document.createElement("div");
    options.className = "answer-list";
    for (const answer of model.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-option";
      button.dataset.answer = answer;
      button.textContent = answer;
      options.append(button);
    }

    container.append(question, options);
  }

  showLoading() {
    this.current = null;
    super.showLoading();
  }
}
