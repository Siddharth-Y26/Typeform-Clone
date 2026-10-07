"use client";

// Right panel of the builder: settings of the selected question, the theme picker,
// and a "coming soon" placeholder for logic jumps.

import { useState } from "react";
import { Split } from "lucide-react";
import type { Form, Question, QuestionType } from "@/lib/api";
import { hasOptions, QUESTION_TYPES, QUESTION_TYPE_LIST, THEMES } from "@/lib/forms";

type Props = {
  form: Form;
  question: Question | undefined; // the selected question, if one is selected
  onQuestionChange: (changes: Partial<Question>) => void;
  onFormChange: (changes: Partial<Form>) => void;
};

type Tab = "question" | "design" | "logic";

export default function SettingsPanel({ form, question, onQuestionChange, onFormChange }: Props) {
  const [tab, setTab] = useState<Tab>("question");

  function changeType(type: QuestionType) {
    if (!question) return;
    // A choice question needs some options to start with. Old options are kept when
    // switching away, so switching back does not lose them.
    const needsOptions = hasOptions(type) && question.options.length === 0;
    onQuestionChange({ type, options: needsOptions ? ["Choice 1", "Choice 2"] : question.options });
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col rounded-xl bg-white">
      <div className="flex gap-4 border-b border-neutral-200 px-4">
        {(["question", "design", "logic"] as Tab[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`border-b-2 py-3 text-sm capitalize ${
              tab === name ? "border-neutral-800 font-medium" : "border-transparent text-neutral-500"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm">
        {tab === "question" && !question && (
          <p className="text-neutral-500">
            Select a question to see its settings. The thank-you screen is edited directly on the canvas.
          </p>
        )}

        {tab === "question" && question && (
          <>
            <label className="mb-1 block font-medium" htmlFor="question-type">
              Type
            </label>
            <select
              id="question-type"
              className="field"
              value={question.type}
              onChange={(event) => changeType(event.target.value as QuestionType)}
            >
              {QUESTION_TYPE_LIST.map((type) => (
                <option key={type} value={type}>
                  {QUESTION_TYPES[type].label}
                </option>
              ))}
            </select>

            <p className="mt-6 mb-2 font-medium">Settings</p>
            <div className="flex items-center justify-between py-1">
              Required
              <Toggle
                label="Required"
                checked={question.required}
                onChange={(required) => onQuestionChange({ required })}
              />
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              The question text, its description and its choices are edited directly on the canvas.
            </p>
          </>
        )}

        {tab === "design" && (
          <>
            <p className="mb-2 font-medium">Theme</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onFormChange({ theme: key })}
                  className={`rounded-lg border p-1 text-left ${
                    form.theme === key ? "border-neutral-800 ring-1 ring-neutral-800" : "border-neutral-200"
                  }`}
                >
                  {/* A miniature of the theme: its background, text colours and button colour */}
                  <div className="rounded-md p-2 text-xs" style={{ background: theme.background }}>
                    <p style={{ color: theme.question }}>Question</p>
                    <p style={{ color: theme.answer }}>Answer</p>
                    <span className="mt-1 block h-2 w-6 rounded-sm" style={{ background: theme.button }} />
                  </div>
                  <p className="px-1 pt-1 text-xs">{theme.name}</p>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-neutral-500">Custom fonts and background images are coming soon.</p>
          </>
        )}

        {tab === "logic" && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-neutral-500">
            <Split size={24} />
            <p className="font-medium text-neutral-800">Logic jumps</p>
            <p>Show different questions depending on earlier answers.</p>
            <span className="soon-badge">Coming soon</span>
          </div>
        )}
      </div>
    </aside>
  );
}

// An on/off switch.
function Toggle(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      onClick={() => props.onChange(!props.checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${props.checked ? "bg-neutral-800" : "bg-neutral-300"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          props.checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}
