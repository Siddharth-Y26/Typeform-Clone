"use client";

// Centre panel of the builder: the selected question, drawn the way respondents will see it.
// It is also the editor: the title, description, choices and thank-you text are typed in place.

import { ArrowRight, Check, X } from "lucide-react";
import type { Form, Question } from "@/lib/api";
import { hasOptions, themeStyle } from "@/lib/forms";
import QuestionInput from "@/components/QuestionInput";

type Props = {
  form: Form;
  selectedId: string; // a question id, or "ending" for the thank-you screen
  onQuestionChange: (id: string, changes: Partial<Question>) => void;
  onFormChange: (changes: Partial<Form>) => void;
};

// A text box that looks like plain text and grows with its content (field-sizing-content).
const INLINE_TEXT = "field-sizing-content block w-full resize-none bg-transparent outline-none";

export default function Canvas({ form, selectedId, onQuestionChange, onFormChange }: Props) {
  const index = form.questions.findIndex((question) => question.id === selectedId);
  const question: Question | undefined = form.questions[index];

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-xl bg-neutral-200/70 p-6">
      {/* The "slide". themeStyle gives everything inside it the colours of the form's theme. */}
      <div
        className="relative m-auto flex min-h-[26rem] w-full max-w-3xl items-center justify-center rounded-xl bg-form-bg p-8 shadow-sm sm:p-12"
        style={themeStyle(form.theme)}
      >
        {question && (
          <div className="flex w-full gap-3">
            <div className="flex shrink-0 items-center gap-1 self-start pt-1 text-answer">
              {index + 1}
              <ArrowRight size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <textarea
                key={question.id} // a new text box per question, so autoFocus runs each time one is selected
                autoFocus
                rows={1}
                aria-label="Question title"
                className={`${INLINE_TEXT} text-2xl text-question placeholder:text-question/40`}
                placeholder="Your question here"
                value={question.title}
                onChange={(event) => onQuestionChange(question.id, { title: event.target.value })}
                // A title is a single line, so Enter must not add a line break.
                onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
              />
              <textarea
                rows={1}
                aria-label="Question description"
                className={`${INLINE_TEXT} mt-2 text-xl text-question/70 placeholder:text-question/40`}
                placeholder="Description (optional)"
                value={question.description}
                onChange={(event) => onQuestionChange(question.id, { description: event.target.value })}
              />

              <div className="mt-8">
                {hasOptions(question.type) ? (
                  <OptionsEditor
                    question={question}
                    onChange={(options) => onQuestionChange(question.id, { options })}
                  />
                ) : (
                  // inert = can be seen but not clicked or focused: this is only a picture of the input.
                  <div inert>
                    <QuestionInput question={question} value="" onChange={() => {}} onPick={() => {}} />
                  </div>
                )}
              </div>

              <span className="ok-button mt-4">
                OK <Check size={20} />
              </span>
            </div>

            {question.required && (
              <span className="absolute top-4 right-5 text-sm text-question/60">* Required</span>
            )}
          </div>
        )}

        {selectedId === "ending" && (
          <div className="w-full text-center">
            <textarea
              rows={1}
              aria-label="Thank-you message"
              className={`${INLINE_TEXT} text-center text-3xl text-question placeholder:text-question/40`}
              placeholder="Say thanks"
              value={form.thank_you_message}
              onChange={(event) => onFormChange({ thank_you_message: event.target.value })}
            />
            <span className="ok-button mt-8">Create a typeform</span>
          </div>
        )}

        {!question && selectedId !== "ending" && (
          <p className="text-center text-question/50">
            This form has no questions yet.
            <br />
            Click <b>Add content</b> on the left to add the first one.
          </p>
        )}
      </div>
    </main>
  );
}

// The choices of a multiple choice / dropdown question, each one an editable box.
function OptionsEditor(props: { question: Question; onChange: (options: string[]) => void }) {
  const options = props.question.options;

  return (
    <div className="flex w-fit max-w-full flex-col gap-2">
      {options.map((option, i) => (
        <div key={i} className="choice group">
          {props.question.type === "multiple_choice" && (
            <span className="key-hint">{String.fromCharCode(65 + i)}</span>
          )}
          <input
            aria-label={`Choice ${i + 1}`}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-answer/40"
            placeholder="Choice"
            value={option}
            // Replace only the option at position i, keep the others.
            onChange={(event) => props.onChange(options.map((old, j) => (j === i ? event.target.value : old)))}
          />
          <button
            type="button"
            aria-label={`Remove choice ${i + 1}`}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100"
            onClick={() => props.onChange(options.filter((_, j) => j !== i))}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="self-start text-sm text-answer underline"
        onClick={() => props.onChange([...options, `Choice ${options.length + 1}`])}
      >
        Add choice
      </button>
    </div>
  );
}
