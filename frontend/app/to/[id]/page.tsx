"use client";

// Public page: /to/<form id>. Anyone with the link can fill in a published form, no login.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type Form } from "@/lib/api";
import FormPlayer from "@/components/FormPlayer";

export default function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .getPublicForm(id)
      .then((loaded) => {
        setForm(loaded);
        document.title = loaded.title;
      })
      .catch(() => setNotFound(true)); // the API answers 404 for drafts and unknown ids
  }, [id]);

  if (notFound) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-2xl">This typeform isn&apos;t available</h1>
        <p className="text-neutral-500">It may have been unpublished or deleted by its owner.</p>
      </div>
    );
  }
  if (!form) return <div className="flex h-screen items-center justify-center text-neutral-400">Loading...</div>;

  return (
    <div className="h-dvh">
      <FormPlayer
        form={form}
        onStart={() => api.startForm(id).catch(() => {})} // only a counter, so a failure is ignored
        onSubmit={(answers) => api.submitResponse(id, answers)}
      />
    </div>
  );
}
