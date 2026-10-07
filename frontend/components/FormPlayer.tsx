"use client";

// The Typeform experience: one question at a time, full screen, with keyboard navigation,
// a progress bar and a thank-you screen. Used by the public page and by the builder's preview.

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, TriangleAlert } from "lucide-react";
import { ApiError, type Answers, type Form, type Question } from "@/lib/api";
import { RATING_VALUES, themeStyle, validateAnswer } from "@/lib/forms";
import QuestionInput from "./QuestionInput";

type Props = {
  form: Form;
  onStart?: () => void; // called once, when the first answer is given
  onSubmit: (answers: Answers) => Promise<unknown>; // must throw if the server rejects the answers
};

// Which answer a key press selects, like Typeform:
// A/B/C... for choices, Y/N for yes-no questions, 1-5 for ratings.
function shortcutValue(question: Question, key: string): string | undefined {
  if (key.length !== 1) return undefined; // not a character key (Shift, ArrowLeft...)
  const letter = key.toUpperCase();

  if (question.type === "multiple_choice") return question.options[letter.charCodeAt(0) - 65]; // "A" is 65
  if (question.type === "yes_no" && letter === "Y") return "Yes";
  if (question.type === "yes_no" && letter === "N") return "No";
  if (question.type === "rating" && RATING_VALUES.includes(letter)) return letter;
  return undefined;
}

export default function FormPlayer({ form, onStart, onSubmit }: Props) {
  const questions = form.questions;

  // index = the question on screen. index === questions.length means the thank-you screen.
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Animation: which way we are moving, and whether the current question is on its way out.
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [leaving, setLeaving] = useState(false);
  const moving = useRef(false); // true during a transition, so extra key presses are ignored

  const question: Question | undefined = questions[index];
  const isLast = index === questions.length - 1;
  const answer = question ? (answers[question.id] ?? "") : "";
  const progress = questions.length > 0 ? Math.round((100 * index) / questions.length) : 100;

  // Slide the current question out, then swap in the new one (which slides in).
  // `pause` keeps the question on screen a little longer first, so a picked option can be seen.
  function goTo(newIndex: number, pause = 0) {
    if (moving.current || newIndex < 0 || newIndex > questions.length) return;
    moving.current = true;
    setError("");

    setTimeout(() => {
      setDirection(newIndex > index ? "up" : "down");
      setLeaving(true);
    }, pause);

    setTimeout(() => {
      setIndex(newIndex);
      setLeaving(false);
      moving.current = false;
    }, pause + 250); // 250ms = length of the leave animation in globals.css
  }

  function setAnswer(value: string) {
    if (!question) return;
    if (Object.keys(answers).length === 0) onStart?.(); // the very first answer counts as a "start"
    setAnswers({ ...answers, [question.id]: value });
    setError("");
  }

  // Click-to-answer questions (choices, yes/no, rating) move on by themselves.
  function pick(value: string) {
    setAnswer(value);
    if (!isLast) goTo(index + 1, 400);
  }

  // Check the answer on screen, then move forward. On the last question, submit.
  function next() {
    if (!question || submitting) return;

    const problem = validateAnswer(question, answer);
    if (problem) {
      setError(problem);
    } else if (isLast) {
      submit();
    } else {
      goTo(index + 1);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      await onSubmit(answers);
      goTo(questions.length); // the thank-you screen
    } catch (problem) {
      // The server validates everything again. If it rejects an answer it replies with
      // {question id: message}, so we jump to that question and show the message.
      const rejected =
        problem instanceof ApiError && problem.status === 422
          ? (problem.detail as Record<string, string>)
          : {};
      const badIndex = questions.findIndex((q) => rejected[q.id]);

      if (badIndex >= 0) {
        setIndex(badIndex);
        setError(rejected[questions[badIndex].id]);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
    setSubmitting(false);
  }

  // Keyboard navigation. There is no dependency array, so the listener is re-attached after
  // every render and the functions it calls always see the latest state.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!question || event.repeat) return; // repeat = key held down; don't race through questions
      const inTextarea = event.target instanceof HTMLTextAreaElement;
      const typing = inTextarea || event.target instanceof HTMLInputElement;
      const withModifier = event.ctrlKey || event.metaKey || event.altKey;

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // Shift+Enter still makes a new line in long text
        next();
      } else if (event.key === "ArrowDown" && !inTextarea) {
        next();
      } else if (event.key === "ArrowUp" && !inTextarea) {
        goTo(index - 1);
      } else if (!typing && !withModifier) {
        const value = shortcutValue(question, event.key);
        if (value) pick(value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="relative h-full w-full bg-form-bg" style={themeStyle(form.theme)}>
      {/* Progress bar */}
      <div className="absolute inset-x-0 top-0 z-10 h-1 bg-answer/20">
        <div className="h-full bg-answer transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="h-full overflow-x-hidden overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-6 py-20">
          {/* key={index}: React builds a new element for every question, which replays the enter animation */}
          <div key={index} className={`w-full max-w-2xl ${leaving ? "leave" : "enter"}-${direction}`}>
            {question ? (
              <div className="flex gap-3">
                <div className="flex shrink-0 items-center gap-1 self-start pt-1 text-answer">
                  {index + 1}
                  <ArrowRight size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-xl text-question sm:text-2xl">
                    {question.title || "..."}
                    {question.required && " *"}
                  </h1>
                  {question.description && (
                    <p className="mt-2 text-lg text-question/70 sm:text-xl">{question.description}</p>
                  )}

                  <div className="mt-8">
                    <QuestionInput question={question} value={answer} onChange={setAnswer} onPick={pick} />
                  </div>

                  {/* Like Typeform, an error takes the place of the OK button until the answer changes */}
                  {error ? (
                    <p className="mt-4 inline-flex items-center gap-1.5 rounded bg-red-100 px-3 py-1.5 text-sm text-red-800">
                      <TriangleAlert size={16} />
                      {error}
                    </p>
                  ) : (
                    <div className="mt-4 flex items-center gap-3">
                      <button type="button" onClick={next} disabled={submitting} className="ok-button">
                        {isLast ? "Submit" : "OK"}
                        {!isLast && <Check size={20} />}
                      </button>
                      <span className="text-xs text-question">
                        press <b>Enter ↵</b>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <h1 className="text-2xl whitespace-pre-line text-question sm:text-3xl">
                  {form.thank_you_message}
                </h1>
                <a href="/" target="_blank" className="ok-button mt-8">
                  Create a typeform
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: previous / next arrows */}
      <div className="absolute right-4 bottom-4 flex items-center gap-2 text-button-text">
        <div className="flex overflow-hidden rounded">
          <button
            type="button"
            aria-label="Previous question"
            onClick={() => goTo(index - 1)}
            disabled={!question || index === 0}
            className="bg-button p-1.5 disabled:opacity-50"
          >
            <ChevronUp size={20} />
          </button>
          <button
            type="button"
            aria-label="Next question"
            onClick={next}
            disabled={!question}
            className="border-l border-form-bg/30 bg-button p-1.5 disabled:opacity-50"
          >
            <ChevronDown size={20} />
          </button>
        </div>
        <span className="rounded bg-button px-3 py-1.5 text-sm">
          Powered by <b>Typeform Clone</b>
        </span>
      </div>
    </div>
  );
}
