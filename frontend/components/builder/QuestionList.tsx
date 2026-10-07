"use client";

// Left panel of the builder: the ordered list of questions.
// Add a question, click one to edit it, drag to reorder, or delete it.

import { useState } from "react";
import { CreditCard, GripVertical, PartyPopper, Plus, Trash2, Upload } from "lucide-react";
import type { Question, QuestionType } from "@/lib/api";
import { QUESTION_TYPES, QUESTION_TYPE_LIST } from "@/lib/forms";
import Modal from "@/components/Modal";

type Props = {
  questions: Question[];
  selectedId: string; // a question id, or "ending" for the thank-you screen
  onSelect: (id: string) => void;
  onAdd: (type: QuestionType) => void;
  onMove: (from: number, to: number) => void;
  onDelete: (id: string) => void;
};

const ROW = "flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm";

export default function QuestionList({ questions, selectedId, onSelect, onAdd, onMove, onDelete }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleting, setDeleting] = useState<Question | null>(null); // question waiting for "are you sure?"
  const [dragIndex, setDragIndex] = useState<number | null>(null); // position of the question being dragged

  // Drag and drop uses the browser's built-in events (no library). While a question is dragged
  // over another one we swap them straight away, so the list reorders live under the cursor.
  function handleDragOver(event: React.DragEvent, overIndex: number) {
    event.preventDefault(); // without this the browser does not allow dropping here
    if (dragIndex !== null && dragIndex !== overIndex) {
      onMove(dragIndex, overIndex);
      setDragIndex(overIndex); // the dragged question now lives at the new position
    }
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col rounded-xl bg-white">
      <div className="p-3">
        <button type="button" className="btn btn-dark w-full" onClick={() => setPickerOpen(true)}>
          <Plus size={16} /> Add content
        </button>
      </div>

      <ol className="min-h-0 flex-1 overflow-y-auto px-2">
        {questions.map((question, i) => {
          const type = QUESTION_TYPES[question.type];
          return (
            <li
              key={question.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(event) => handleDragOver(event, i)}
              onDragEnd={() => setDragIndex(null)}
              onClick={() => onSelect(question.id)}
              className={`group ${ROW} ${question.id === selectedId ? "bg-neutral-100" : "hover:bg-neutral-50"} ${
                dragIndex === i ? "opacity-40" : ""
              }`}
            >
              <GripVertical size={14} className="shrink-0 cursor-grab text-neutral-300 group-hover:text-neutral-500" />
              <span
                className="flex h-6 w-12 shrink-0 items-center justify-between rounded px-1.5 text-xs font-medium"
                style={{ background: type.color }}
              >
                <type.icon size={12} />
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{question.title || "..."}</span>
              <button
                type="button"
                aria-label={`Delete question ${i + 1}`}
                className="rounded p-1 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-neutral-200 hover:text-red-700 focus:opacity-100"
                onClick={(event) => {
                  event.stopPropagation(); // don't also select the question
                  setDeleting(question);
                }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-neutral-200 p-2">
        <p className="px-2 py-1 text-xs font-medium text-neutral-500">Endings</p>
        <button
          type="button"
          onClick={() => onSelect("ending")}
          className={`${ROW} ${selectedId === "ending" ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
        >
          <span className="flex h-6 w-12 items-center justify-center rounded bg-neutral-200">
            <PartyPopper size={12} />
          </span>
          Thank-you screen
        </button>
      </div>

      {pickerOpen && (
        <Modal title="Add content" wide onClose={() => setPickerOpen(false)}>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {QUESTION_TYPE_LIST.map((type) => {
              const info = QUESTION_TYPES[type];
              return (
                <button
                  key={type}
                  type="button"
                  className={`${ROW} hover:bg-neutral-100`}
                  onClick={() => {
                    onAdd(type);
                    setPickerOpen(false);
                  }}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded" style={{ background: info.color }}>
                    <info.icon size={14} />
                  </span>
                  {info.label}
                </button>
              );
            })}

            {/* Placeholder question types from the assignment brief */}
            {[
              { label: "File Upload", icon: Upload },
              { label: "Payment", icon: CreditCard },
            ].map((soon) => (
              <div key={soon.label} className={`${ROW} cursor-not-allowed text-neutral-400`}>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-neutral-100">
                  <soon.icon size={14} />
                </span>
                {soon.label}
                <span className="soon-badge">Soon</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete this question?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-neutral-600">
            Any answers already collected for <b>{deleting.title || "this question"}</b> will be deleted too.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-light" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                onDelete(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </aside>
  );
}
