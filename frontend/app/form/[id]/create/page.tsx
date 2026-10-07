"use client";

// Builder: /form/<id>/create. Three panels side by side:
// question list (left), canvas with the selected question (centre), settings (right).

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { api, type Form, type Question, type QuestionType } from "@/lib/api";
import { newQuestion } from "@/lib/forms";
import FormHeader from "@/components/FormHeader";
import FormPlayer from "@/components/FormPlayer";
import QuestionList from "@/components/builder/QuestionList";
import Canvas from "@/components/builder/Canvas";
import SettingsPanel from "@/components/builder/SettingsPanel";

// The page only loads the form. The Builder below is rendered once the form
// has arrived, so inside it `form` is never null.
export default function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .getForm(id)
      .then(setForm)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p>This form does not exist.</p>
        <Link href="/" className="btn btn-dark">
          Back to workspace
        </Link>
      </div>
    );
  }
  if (!form) return <div className="flex h-screen items-center justify-center text-neutral-400">Loading...</div>;

  // key: if the id in the URL changes, React throws the old Builder away and starts a fresh one.
  return <Builder key={form.id} initialForm={form} />;
}

function Builder({ initialForm }: { initialForm: Form }) {
  const [form, setForm] = useState(initialForm);
  // What the canvas shows: a question id, or "ending" for the thank-you screen.
  const [selectedId, setSelectedId] = useState(initialForm.questions[0]?.id ?? "");
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [previewOpen, setPreviewOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Every edit goes through here: update the screen at once, then autosave.
  // Each edit restarts a 600ms countdown, so we only save when the creator pauses (debouncing).
  function change(changes: Partial<Form>) {
    const updated = { ...form, ...changes };
    setForm(updated);
    setSaveStatus("Saving...");

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api
        .saveForm(updated)
        .then(() => setSaveStatus("Saved"))
        .catch(() => setSaveStatus("Could not save"));
    }, 600);
  }

  function addQuestion(type: QuestionType) {
    const question = newQuestion(type);
    change({ questions: [...form.questions, question] });
    setSelectedId(question.id);
  }

  function updateQuestion(id: string, changes: Partial<Question>) {
    change({ questions: form.questions.map((q) => (q.id === id ? { ...q, ...changes } : q)) });
  }

  function deleteQuestion(id: string) {
    const remaining = form.questions.filter((q) => q.id !== id);
    change({ questions: remaining });
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? "");
  }

  // The order of the array is the order of the form; the server stores each index as `position`.
  function moveQuestion(from: number, to: number) {
    const questions = [...form.questions];
    const [moved] = questions.splice(from, 1); // take it out...
    questions.splice(to, 0, moved); // ...and put it back in at the new place
    change({ questions });
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-100">
      <FormHeader
        form={form}
        active="create"
        onFormChange={setForm}
        onTitleChange={(title) => change({ title })}
        saveStatus={saveStatus}
        onPreview={() => setPreviewOpen(true)}
      />

      <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-2">
        <QuestionList
          questions={form.questions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={addQuestion}
          onMove={moveQuestion}
          onDelete={deleteQuestion}
        />
        <Canvas
          form={form}
          selectedId={selectedId}
          onQuestionChange={updateQuestion}
          onFormChange={change}
        />
        <SettingsPanel
          form={form}
          question={form.questions.find((q) => q.id === selectedId)}
          onQuestionChange={(changes) => updateQuestion(selectedId, changes)}
          onFormChange={change}
        />
      </div>

      {/* Live preview: the real form player, fed with what is on screen right now (even unsaved edits) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900/80 p-4 sm:px-10 sm:py-6">
          <div className="mb-3 flex items-center justify-between text-sm text-white">
            Preview: answers are not saved
            <button type="button" className="btn btn-light" onClick={() => setPreviewOpen(false)}>
              <X size={14} /> Close preview
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
            <FormPlayer form={form} onSubmit={async () => {}} />
          </div>
        </div>
      )}
    </div>
  );
}
