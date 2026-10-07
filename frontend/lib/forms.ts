// Things the builder, the form player and the results page all need to know about forms:
// the question types, the themes, and the answer validation rules.

import type { CSSProperties } from "react";
import {
  AlignLeft,
  Check,
  ChevronDown,
  CircleSlash,
  Hash,
  Mail,
  Minus,
  Star,
  type LucideIcon,
} from "lucide-react";
import type { Question, QuestionType } from "./api";

// ---------- Question types ----------

// Label, icon and badge colour of each question type, in the order the "Add content" menu shows them.
export const QUESTION_TYPES: Record<QuestionType, { label: string; icon: LucideIcon; color: string }> = {
  short_text: { label: "Short Text", icon: Minus, color: "#bfdbfe" },
  long_text: { label: "Long Text", icon: AlignLeft, color: "#bfdbfe" },
  multiple_choice: { label: "Multiple Choice", icon: Check, color: "#e9d5ff" },
  dropdown: { label: "Dropdown", icon: ChevronDown, color: "#e9d5ff" },
  yes_no: { label: "Yes/No", icon: CircleSlash, color: "#e9d5ff" },
  email: { label: "Email", icon: Mail, color: "#fecdd3" },
  number: { label: "Number", icon: Hash, color: "#fde68a" },
  rating: { label: "Rating", icon: Star, color: "#bbf7d0" },
};

// The type names as a list, for menus that show every type.
export const QUESTION_TYPE_LIST = Object.keys(QUESTION_TYPES) as QuestionType[];

export const RATING_VALUES = ["1", "2", "3", "4", "5"];

// Only these two types have a list of options written by the creator.
export function hasOptions(type: QuestionType) {
  return type === "multiple_choice" || type === "dropdown";
}

// A blank question for the builder. The id is made here in the browser,
// so the question can be shown and edited before the server has saved it.
export function newQuestion(type: QuestionType): Question {
  return {
    id: crypto.randomUUID(),
    type,
    title: "",
    description: "",
    required: false,
    options: hasOptions(type) ? ["Choice 1", "Choice 2"] : [],
  };
}

// ---------- Validation ----------

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/; // something@something.something
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/; // 7, -3, 4.5

// Returns an error message, or "" when the answer is fine.
// The server checks the same rules again (backend/validation.py).
export function validateAnswer(question: Question, answer: string): string {
  const value = answer.trim();

  if (value === "") return question.required ? "Please fill this in" : "";
  if (question.type === "email" && !EMAIL_PATTERN.test(value)) {
    return "Hmm... that email doesn't look right";
  }
  if (question.type === "number" && !NUMBER_PATTERN.test(value)) {
    return "Numbers only please";
  }
  return "";
}

// ---------- Themes ----------

export type Theme = {
  name: string;
  background: string;
  question: string; // colour of the question text
  answer: string; // colour of answers, option boxes and the progress bar
  button: string;
  buttonText: string;
};

export const THEMES: Record<string, Theme> = {
  default: { name: "Default", background: "#ffffff", question: "#000000", answer: "#0445af", button: "#0445af", buttonText: "#ffffff" },
  midnight: { name: "Midnight", background: "#14213d", question: "#ffffff", answer: "#8ecdf7", button: "#8ecdf7", buttonText: "#14213d" },
  forest: { name: "Forest", background: "#f0f5ec", question: "#1e3a2b", answer: "#2d6a4f", button: "#2d6a4f", buttonText: "#ffffff" },
  sunset: { name: "Sunset", background: "#fff3ea", question: "#40201a", answer: "#d9480f", button: "#d9480f", buttonText: "#ffffff" },
  lavender: { name: "Lavender", background: "#f3efff", question: "#2b2150", answer: "#6741d9", button: "#6741d9", buttonText: "#ffffff" },
  charcoal: { name: "Charcoal", background: "#262627", question: "#ffffff", answer: "#ffd166", button: "#ffd166", buttonText: "#262627" },
};

// Turns a theme into CSS variables. globals.css maps them to classes like text-answer and bg-form-bg,
// so every element inside the styled container picks up the theme's colours.
export function themeStyle(themeKey: string): CSSProperties {
  const theme = THEMES[themeKey] ?? THEMES.default;
  return {
    "--form-bg": theme.background,
    "--form-question": theme.question,
    "--form-answer": theme.answer,
    "--form-button": theme.button,
    "--form-button-text": theme.buttonText,
  } as CSSProperties;
}

// ---------- Small helpers ----------

// The link respondents open. Same site as the builder, under /to/<form id>.
export function publicLink(formId: string) {
  return `${window.location.origin}/to/${formId}`;
}

// The API sends UTC times without a timezone ("2026-10-07T09:30:00").
// Adding "Z" tells the browser it is UTC, so it converts to the viewer's local time.
export function formatDate(utcTime: string) {
  return new Date(utcTime + "Z").toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
