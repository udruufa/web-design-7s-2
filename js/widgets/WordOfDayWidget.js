import { ApiWidget } from "./ApiWidget.js";

const WORD_KEYS = ["word", "term", "lemma"];
const DEFINITION_KEYS = ["definition", "meaning", "gloss", "text"];
const POS_KEYS = ["partOfSpeech", "part_of_speech", "pos"];

/** Достаёт строку из строки, массива или объекта вида { text | definition | meaning }. */
function pickText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return pickText(value[0]);
  if (value && typeof value === "object") {
    for (const key of DEFINITION_KEYS) {
      const text = pickText(value[key]);
      if (text) return text;
    }
  }
  return "";
}

/** Ищет первое непустое значение по списку ключей, спускаясь вглубь объекта. */
function findByKeys(node, keys, depth = 0) {
  if (!node || typeof node !== "object" || depth > 4) return undefined;
  for (const key of keys) {
    if (node[key] != null && node[key] !== "") return node[key];
  }
  for (const value of Object.values(node)) {
    const found = findByKeys(value, keys, depth + 1);
    if (found != null) return found;
  }
  return undefined;
}

/** Слово дня: случайное слово и его значение (Random Lexicon API, ключ не нужен). */
export class WordOfDayWidget extends ApiWidget {
  constructor(id, { data, collapsed } = {}) {
    super(id, "Слово дня", {
      type: "word",
      subtitle: "Случайное слово и значение",
      icon: "Aa",
      collapsed,
      data
    });
  }

  buildUrl() {
    return "https://randomlexicon.com/api/random-definition";
  }

  parse(payload) {
    const word = pickText(findByKeys(payload, WORD_KEYS));
    const definition = pickText(findByKeys(payload, DEFINITION_KEYS.filter(key => key !== "text")));
    const partOfSpeech = pickText(findByKeys(payload, POS_KEYS));

    if (!word || !definition) {
      throw this.friendlyError("Сервис прислал слово без значения. Нажми «Повторить».");
    }
    return { word, definition, partOfSpeech };
  }

  renderResult({ word, definition, partOfSpeech }, container) {
    const heading = document.createElement("div");
    heading.className = "api-word-heading";

    const title = document.createElement("div");
    title.className = "api-word";
    title.textContent = word;
    heading.append(title);

    if (partOfSpeech) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = partOfSpeech;
      heading.append(chip);
    }
    container.append(heading);

    const description = document.createElement("p");
    description.className = "api-text";
    description.textContent = definition;
    container.append(description);
  }
}
