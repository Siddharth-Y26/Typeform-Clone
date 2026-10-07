"use client";

// The top bar shared by the builder and the results page:
// breadcrumb with the form title, the tabs, and the publish / share controls.

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Copy, ExternalLink, Play, TextCursorInput } from "lucide-react";
import { api, ApiError, type Form } from "@/lib/api";
import { publicLink } from "@/lib/forms";
import Modal from "./Modal";

type Props = {
  form: Form;
  active: "create" | "results";
  onFormChange: (form: Form) => void; // called after publishing / unpublishing
  // The next three are only passed by the builder.
  onTitleChange?: (title: string) => void; // makes the title editable in place
  saveStatus?: string; // "Saved", "Saving..."
  onPreview?: () => void;
};

const TAB = "flex h-14 items-center gap-1.5 border-b-2 px-1 text-sm";
const ACTIVE_TAB = `${TAB} border-neutral-800 font-medium`;
const OTHER_TAB = `${TAB} border-transparent text-neutral-500 hover:text-neutral-800`;

export default function FormHeader({ form, active, onFormChange, onTitleChange, saveStatus, onPreview }: Props) {
  const [shareOpen, setShareOpen] = useState(false);

  async function setPublished(published: boolean) {
    try {
      await api.updateForm(form.id, { is_published: published });
      onFormChange({ ...form, is_published: published });
      setShareOpen(published); // after publishing, show the link right away
      toast.success(published ? "Your form is live!" : "Form unpublished");
    } catch (problem) {
      // For example the server refuses to publish a form that has no questions.
      toast.error(problem instanceof ApiError ? problem.message : "Something went wrong");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(publicLink(form.id));
    toast.success("Link copied");
  }

  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-neutral-200 bg-white px-4">
      {/* Left: breadcrumb */}
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Link
          href="/"
          aria-label="Back to workspace"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-white"
        >
          <TextCursorInput size={16} />
        </Link>
        <Link href="/" className="hidden text-neutral-500 hover:text-neutral-800 lg:block">
          My workspace
        </Link>
        <span className="hidden text-neutral-300 lg:block">/</span>
        {onTitleChange ? (
          <input
            aria-label="Form title"
            className="min-w-0 flex-1 truncate rounded px-1.5 py-1 font-medium outline-none hover:bg-neutral-100 focus:bg-neutral-100"
            value={form.title}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        ) : (
          <span className="truncate px-1.5 font-medium">{form.title}</span>
        )}
      </div>

      {/* Middle: tabs. Workflow and Connect are placeholders. */}
      <nav className="flex items-center gap-5">
        <Link href={`/form/${form.id}/create`} className={active === "create" ? ACTIVE_TAB : OTHER_TAB}>
          Create
        </Link>
        <button type="button" className={`${OTHER_TAB} hidden md:flex`} onClick={() => toast("Logic jumps and branching are coming soon")}>
          Workflow <span className="soon-badge">Soon</span>
        </button>
        <button type="button" className={`${OTHER_TAB} hidden md:flex`} onClick={() => toast("Integrations and webhooks are coming soon")}>
          Connect <span className="soon-badge">Soon</span>
        </button>
        <button type="button" className={OTHER_TAB} onClick={() => setShareOpen(true)}>
          Share
        </button>
        <Link href={`/form/${form.id}/results`} className={active === "results" ? ACTIVE_TAB : OTHER_TAB}>
          Results
        </Link>
      </nav>

      {/* Right: save status, preview, publish */}
      <div className="flex items-center justify-end gap-2">
        {saveStatus && <span className="hidden text-xs text-neutral-400 sm:block">{saveStatus}</span>}
        {onPreview && (
          <button type="button" className="btn btn-light" onClick={onPreview}>
            <Play size={14} /> Preview
          </button>
        )}
        {form.is_published ? (
          <button type="button" className="btn btn-light" onClick={() => setShareOpen(true)}>
            <span className="h-2 w-2 rounded-full bg-green-600" /> Published
          </button>
        ) : (
          <button type="button" className="btn btn-dark" onClick={() => setPublished(true)}>
            Publish
          </button>
        )}
      </div>

      {shareOpen && (
        <Modal title="Share your typeform" onClose={() => setShareOpen(false)}>
          {form.is_published ? (
            <>
              <p className="text-sm text-neutral-600">
                Anyone with this link can fill in your form. No login needed.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  readOnly
                  aria-label="Public link"
                  className="field"
                  value={publicLink(form.id)}
                  onFocus={(event) => event.target.select()}
                />
                <button type="button" className="btn btn-dark" onClick={copyLink}>
                  <Copy size={14} /> Copy
                </button>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <a href={publicLink(form.id)} target="_blank" className="btn btn-light">
                  <ExternalLink size={14} /> Open form
                </a>
                <button type="button" className="btn text-red-700 hover:bg-red-50" onClick={() => setPublished(false)}>
                  Unpublish
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-600">
                This form is still a draft. Publish it to get a link you can share.
              </p>
              <div className="mt-5 flex justify-end">
                <button type="button" className="btn btn-dark" onClick={() => setPublished(true)}>
                  Publish
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </header>
  );
}
