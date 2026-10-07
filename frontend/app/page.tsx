"use client";

// Dashboard (the "workspace"): lists the creator's forms and lets them
// create, rename, duplicate and delete forms.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ChartNoAxesColumn,
  CircleHelp,
  Copy,
  Ellipsis,
  Link2,
  Pencil,
  Plus,
  Search,
  TextCursorInput,
  Trash2,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { api, type FormSummary } from "@/lib/api";
import { formatDate, publicLink, THEMES } from "@/lib/forms";
import Modal from "@/components/Modal";

// Which dialog is open, and for which form.
type Dialog = { kind: "create" } | { kind: "rename" | "delete"; form: FormSummary };

// One grid for the header row and every form row, so the columns line up.
// Phones only have room for title, status and menu; the cells marked WIDE_ONLY appear from "md" up.
const COLUMNS =
  "grid grid-cols-[1fr_5.5rem_2.5rem] md:grid-cols-[1fr_6rem_6rem_6rem_10rem_2.5rem] items-center gap-2";
const WIDE_ONLY = "hidden md:block";

export default function DashboardPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormSummary[] | null>(null); // null = still loading
  const [search, setSearch] = useState("");
  const [menuFor, setMenuFor] = useState(""); // id of the form whose "..." menu is open
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [name, setName] = useState(""); // the text box in the create / rename dialog

  useEffect(() => {
    api
      .listForms()
      .then(setForms)
      .catch(() => toast.error("Could not load your forms. Is the backend running?"));
  }, []);

  // After every change we fetch the list again, so the screen always matches the database.
  async function reload() {
    setForms(await api.listForms());
  }

  function openDialog(next: Dialog) {
    setName(next.kind === "rename" ? next.form.title : "");
    setDialog(next);
    setMenuFor("");
  }

  // The create and rename dialogs share one text box and one submit handler.
  async function submitName(event: React.FormEvent) {
    event.preventDefault();
    if (dialog?.kind === "create") {
      const form = await api.createForm(name);
      router.push(`/form/${form.id}/create`); // straight into the builder
    } else if (dialog?.kind === "rename") {
      await api.updateForm(dialog.form.id, { title: name });
      setDialog(null);
      toast.success("Form renamed");
      reload();
    }
  }

  async function duplicateForm(form: FormSummary) {
    setMenuFor("");
    await api.duplicateForm(form.id);
    toast.success("Form duplicated");
    reload();
  }

  async function deleteForm(form: FormSummary) {
    await api.deleteForm(form.id);
    setDialog(null);
    toast.success("Form deleted");
    reload();
  }

  function copyLink(form: FormSummary) {
    navigator.clipboard.writeText(publicLink(form.id));
    setMenuFor("");
    toast.success("Link copied");
  }

  const visibleForms = (forms ?? []).filter((form) =>
    form.title.toLowerCase().includes(search.toLowerCase()),
  );
  const totalResponses = (forms ?? []).reduce((sum, form) => sum + form.response_count, 0);

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4">
        <div className="flex items-center gap-2 font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-800 text-white">
            <TextCursorInput size={16} />
          </span>
          Typeform Clone
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-light" onClick={() => toast("Plans are coming soon")}>
            <Zap size={14} /> View plans
          </button>
          <CircleHelp size={18} className="text-neutral-500" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-xs font-medium">
            ME
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 p-4 md:flex">
          <button type="button" className="btn btn-dark w-full" onClick={() => openDialog({ kind: "create" })}>
            <Plus size={16} /> Create a new form
          </button>

          <label className="mt-4 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm">
            <Search size={14} className="text-neutral-500" />
            <input
              className="w-full bg-transparent outline-none"
              placeholder="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <p className="mt-6 mb-2 text-xs font-medium text-neutral-500">Workspaces</p>
          <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium">
            My workspace <span className="text-neutral-500">{forms?.length ?? 0}</span>
          </div>

          {/* Placeholder sections from the assignment brief */}
          <button
            type="button"
            className="mt-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
            onClick={() => toast("Integrations and webhooks are coming soon")}
          >
            Integrations <span className="soon-badge">Soon</span>
          </button>

          <div className="mt-auto rounded-lg border border-neutral-200 p-3 text-sm">
            <p className="text-neutral-500">Responses collected</p>
            <p className="text-2xl font-medium">{totalResponses}</p>
          </div>
        </aside>

        {/* Form list */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-2">
            <h1 className="text-2xl font-medium">My workspace</h1>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => toast("Team collaboration is coming soon")}
              >
                <Users size={14} /> Invite
              </button>
              <button type="button" className="btn btn-dark md:hidden" onClick={() => openDialog({ kind: "create" })}>
                <Plus size={16} /> New form
              </button>
            </div>
          </div>

          <div className={`${COLUMNS} mb-2 px-4 text-xs text-neutral-500`}>
            <span>Typeform</span>
            <span>Status</span>
            <span className={WIDE_ONLY}>Responses</span>
            <span className={WIDE_ONLY}>Completion</span>
            <span className={WIDE_ONLY}>Updated</span>
          </div>

          {forms === null && (
            <div className="p-12 text-center text-neutral-500">
              <p>Loading your forms...</p>
              <p className="mt-1 text-xs">The first load can take up to a minute while the server wakes up.</p>
            </div>
          )}

          {forms !== null && visibleForms.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
              {search ? `No forms match "${search}".` : "You have no forms yet. Create your first one!"}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {visibleForms.map((form) => (
              <div
                key={form.id}
                onClick={() => router.push(`/form/${form.id}/create`)}
                className={`${COLUMNS} cursor-pointer rounded-lg border border-neutral-200 bg-white p-4 text-sm hover:shadow-md`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* A tiny thumbnail in the colours of the form's theme */}
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-200"
                    style={{ background: (THEMES[form.theme] ?? THEMES.default).background }}
                  >
                    <span
                      className="h-1 w-5 rounded"
                      style={{ background: (THEMES[form.theme] ?? THEMES.default).answer }}
                    />
                  </span>
                  <span className="truncate font-medium">{form.title}</span>
                </div>

                <span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      form.is_published ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {form.is_published ? "Published" : "Draft"}
                  </span>
                </span>
                <span className={WIDE_ONLY}>{form.response_count}</span>
                <span className={WIDE_ONLY}>
                  {form.response_count > 0 ? `${form.completion_rate}%` : "-"}
                </span>
                <span className={`${WIDE_ONLY} text-neutral-500`}>{formatDate(form.updated_at)}</span>

                {/* The "..." menu. stopPropagation keeps clicks here from also opening the form. */}
                <div className="relative" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    aria-label={`Actions for ${form.title}`}
                    className="rounded p-1.5 hover:bg-neutral-100"
                    onClick={() => setMenuFor(menuFor === form.id ? "" : form.id)}
                  >
                    <Ellipsis size={18} />
                  </button>

                  {menuFor === form.id && (
                    <>
                      {/* An invisible full-screen layer: clicking anywhere else closes the menu */}
                      <div className="fixed inset-0 z-10" onClick={() => setMenuFor("")} />
                      <div className="absolute top-9 right-0 z-20 w-44 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                        <MenuItem icon={Pencil} label="Open" onClick={() => router.push(`/form/${form.id}/create`)} />
                        <MenuItem
                          icon={ChartNoAxesColumn}
                          label="Results"
                          onClick={() => router.push(`/form/${form.id}/results`)}
                        />
                        {form.is_published && (
                          <MenuItem icon={Link2} label="Copy link" onClick={() => copyLink(form)} />
                        )}
                        <MenuItem
                          icon={TextCursorInput}
                          label="Rename"
                          onClick={() => openDialog({ kind: "rename", form })}
                        />
                        <MenuItem icon={Copy} label="Duplicate" onClick={() => duplicateForm(form)} />
                        <MenuItem
                          icon={Trash2}
                          label="Delete"
                          danger
                          onClick={() => openDialog({ kind: "delete", form })}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Create and rename share one dialog */}
      {dialog && dialog.kind !== "delete" && (
        <Modal
          title={dialog.kind === "create" ? "Create a new form" : "Rename this form"}
          onClose={() => setDialog(null)}
        >
          <form onSubmit={submitName}>
            <input
              autoFocus
              className="field"
              placeholder="Give it a name, e.g. Customer feedback"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-light" onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-dark" disabled={name.trim() === ""}>
                {dialog.kind === "create" ? "Create form" : "Rename"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog?.kind === "delete" && (
        <Modal title="Delete this form?" onClose={() => setDialog(null)}>
          <p className="text-sm text-neutral-600">
            <b>{dialog.form.title}</b> and its {dialog.form.response_count} response
            {dialog.form.response_count === 1 ? "" : "s"} will be deleted. This can&apos;t be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-light" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={() => deleteForm(dialog.form)}>
              Yes, delete it
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// One line of the "..." menu.
function MenuItem(props: { icon: LucideIcon; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-100 ${
        props.danger ? "text-red-700" : ""
      }`}
    >
      <props.icon size={14} />
      {props.label}
    </button>
  );
}
