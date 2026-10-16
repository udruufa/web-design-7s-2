import { ToDoWidget } from "./widgets/ToDoWidget.js";
import { CalendarWidget } from "./widgets/CalendarWidget.js";
import { NotesWidget } from "./widgets/NotesWidget.js";
import { WordOfDayWidget } from "./widgets/WordOfDayWidget.js";
import { FactOfDayWidget } from "./widgets/FactOfDayWidget.js";
import { QuizWidget } from "./widgets/QuizWidget.js";

const REGISTRY = {
  tasks: ToDoWidget,
  calendar: CalendarWidget,
  notes: NotesWidget,
  word: WordOfDayWidget,
  fact: FactOfDayWidget,
  quiz: QuizWidget
};

export function hasWidgetType(type) {
  return Object.hasOwn(REGISTRY, type);
}

export function createWidget(type, { id, data = {}, collapsed = false } = {}) {
  if (!hasWidgetType(type)) return null;
  return new REGISTRY[type](id, { data, collapsed: Boolean(collapsed) });
}
