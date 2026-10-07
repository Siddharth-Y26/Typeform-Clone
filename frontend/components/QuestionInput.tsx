"use client";

// The answer area of one question. It draws a different input for each question type.
// Used by the form player, and by the builder to show what a question will look like.

import { useState } from "react";
import { Check, ChevronDown, Star } from "lucide-react";
import type { Question } from "@/lib/api";
import { RATING_VALUES } from "@/lib/forms";

type Props = {
  question: Question;
  value: string;
  onChange: (value: string) => void; // the person typed something
  onPick: (value: string) => void; // the person clicked an option (the form then moves on by itself)
};

export default function QuestionInput({ question, value, onChange, onPick }: Props) {
  switch (question.type) {
    case "short_text":
    case "email":
    case "number":
      return (
        <input
          autoFocus
          className="text-answer-input"
          // inputMode only picks the phone keyboard; the real checking is done by validateAnswer.
          inputMode={question.type === "number" ? "decimal" : question.type === "email" ? "email" : "text"}
          placeholder={question.type === "email" ? "name@example.com" : "Type your answer here..."}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "long_text":
      return (
        <>
          <textarea
            autoFocus
            rows={3}
            className="text-answer-input resize-none"
            placeholder="Type your answer here..."
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <p className="mt-2 text-xs text-answer">
            <b>Shift ⇧ + Enter ↵</b> to make a line break
          </p>
        </>
      );

    case "multiple_choice": {
      const letters = question.options.map((_, i) => String.fromCharCode(65 + i)); // A, B, C...
      return <Choices options={question.options} keys={letters} value={value} onPick={onPick} />;
    }

    case "yes_no":
      return <Choices options={["Yes", "No"]} keys={["Y", "N"]} value={value} onPick={onPick} />;

    case "dropdown":
      return <Dropdown options={question.options} value={value} onPick={onPick} />;

    case "rating":
      return <Rating value={value} onPick={onPick} />;
  }
}

// A list of option boxes, each with the key that selects it.
function Choices(props: { options: string[]; keys: string[]; value: string; onPick: (value: string) => void }) {
  return (
    <div className="flex w-fit max-w-full flex-col gap-2">
      {props.options.map((option, i) => {
        const selected = option === props.value;
        return (
          <button
            key={i}
            type="button"
            onClick={() => props.onPick(option)}
            className={`choice hover:bg-answer/30 ${selected ? "choice-selected blink" : ""}`}
          >
            <span className={`key-hint ${selected ? "bg-answer text-form-bg" : ""}`}>{props.keys[i]}</span>
            <span className="flex-1">{option}</span>
            {selected && <Check size={18} />}
          </button>
        );
      })}
    </div>
  );
}

// A text box that filters the list of options underneath it.
function Dropdown(props: { options: string[]; value: string; onPick: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const matches = props.options.filter((option) => option.toLowerCase().includes(search.toLowerCase()));

  function choose(option: string) {
    setOpen(false);
    setSearch("");
    props.onPick(option);
  }

  return (
    <div>
      <div className="relative">
        <input
          autoFocus
          className="text-answer-input pr-10"
          placeholder="Type or select an option"
          value={open ? search : props.value} // while closed, the box shows the chosen option
          onFocus={() => setOpen(true)}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ChevronDown size={28} className="pointer-events-none absolute top-1 right-0 text-answer" />
      </div>

      {open && (
        <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
          {matches.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              className={`choice hover:bg-answer/30 ${option === props.value ? "choice-selected" : ""}`}
            >
              {option}
            </button>
          ))}
          {matches.length === 0 && <p className="text-answer/60">No suggestions found</p>}
        </div>
      )}
    </div>
  );
}

// Five stars. Stars up to the hovered (or chosen) one are filled in.
function Rating(props: { value: string; onPick: (value: string) => void }) {
  const [hovered, setHovered] = useState(0);
  const filledUpTo = hovered || Number(props.value);

  return (
    <div className="flex gap-1 sm:gap-3" onMouseLeave={() => setHovered(0)}>
      {RATING_VALUES.map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => props.onPick(rating)}
          onMouseEnter={() => setHovered(Number(rating))}
          className="flex flex-col items-center gap-1 text-answer"
        >
          <Star
            strokeWidth={1}
            className={`h-11 w-11 sm:h-14 sm:w-14 ${Number(rating) <= filledUpTo ? "fill-answer" : "fill-answer/10"}`}
          />
          {rating}
        </button>
      ))}
    </div>
  );
}
