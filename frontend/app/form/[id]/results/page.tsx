"use client";

// Results: /form/<id>/results. Two tabs:
// "Insights" (summary numbers and per-question stats) and "Responses" (a table of submissions).

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { api, type Form, type FormResponse, type FormStats, type Question } from "@/lib/api";
import { formatDate, QUESTION_TYPES, RATING_VALUES } from "@/lib/forms";
import FormHeader from "@/components/FormHeader";
import Modal from "@/components/Modal";

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [stats, setStats] = useState<FormStats | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"insights" | "responses">("insights");
  const [opened, setOpened] = useState<FormResponse | null>(null); // the response shown in full

  useEffect(() => {
    // The three requests do not depend on each other, so they run at the same time.
    Promise.all([api.getForm(id), api.getStats(id), api.listResponses(id)])
      .then(([loadedForm, loadedStats, loadedResponses]) => {
        setForm(loadedForm);
        setStats(loadedStats);
        setResponses(loadedResponses);
      })
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
  if (!form || !stats) {
    return <div className="flex h-screen items-center justify-center text-neutral-400">Loading...</div>;
  }

  return (
    <div className="flex h-screen flex-col">
      <FormHeader form={form} active="results" onFormChange={setForm} />

      <main className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between gap-2">
            <div className="flex gap-1 rounded-lg bg-neutral-200/70 p-1">
              <TabButton active={tab === "insights"} onClick={() => setTab("insights")}>
                Insights
              </TabButton>
              <TabButton active={tab === "responses"} onClick={() => setTab("responses")}>
                Responses [{stats.responses}]
              </TabButton>
            </div>
            {/* A plain link: the browser downloads the file the API sends back. */}
            <a href={api.csvUrl(form.id)} className="btn btn-light bg-white">
              <Download size={14} /> Download CSV
            </a>
          </div>

          {stats.responses === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center text-neutral-500">
              No responses yet. Publish the form and share its link to start collecting them.
            </div>
          )}

          {tab === "insights" && stats.responses > 0 && (
            <>
              <div className="mb-6 grid grid-cols-3 gap-3">
                <StatTile label="Starts" value={stats.starts} />
                <StatTile label="Responses" value={stats.responses} />
                <StatTile label="Completion rate" value={`${stats.completion_rate}%`} />
              </div>

              <div className="flex flex-col gap-3">
                {form.questions.map((question, i) => (
                  <QuestionSummary
                    key={question.id}
                    number={i + 1}
                    question={question}
                    stats={stats}
                    responses={responses}
                  />
                ))}
              </div>
            </>
          )}

          {tab === "responses" && stats.responses > 0 && (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 text-xs text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Submitted</th>
                    {form.questions.map((question) => (
                      <th key={question.id} className="max-w-48 truncate px-4 py-3 font-medium">
                        {question.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => (
                    <tr
                      key={response.id}
                      onClick={() => setOpened(response)}
                      className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-500">
                        {formatDate(response.submitted_at)}
                      </td>
                      {form.questions.map((question) => (
                        <td key={question.id} className="max-w-48 truncate px-4 py-3">
                          {response.answers[question.id] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* One response in full: every question with its answer */}
      {opened && (
        <Modal title={`Response #${opened.id}`} wide onClose={() => setOpened(null)}>
          <p className="mb-4 text-sm text-neutral-500">Submitted {formatDate(opened.submitted_at)}</p>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {form.questions.map((question, i) => (
              <div key={question.id}>
                <p className="text-sm text-neutral-500">
                  {i + 1}. {question.title}
                </p>
                <p className="whitespace-pre-line">
                  {opened.answers[question.id] ?? <span className="text-neutral-400">No answer</span>}
                </p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-md px-3 py-1 text-sm ${props.active ? "bg-white font-medium shadow-sm" : "text-neutral-600"}`}
    >
      {props.children}
    </button>
  );
}

// A headline number with its label.
function StatTile(props: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-sm text-neutral-500">{props.label}</p>
      <p className="text-3xl font-semibold">{props.value}</p>
    </div>
  );
}

// The answers a question can have, when that list is fixed. Text questions return an empty list.
function fixedAnswers(question: Question): string[] {
  if (question.type === "multiple_choice" || question.type === "dropdown") return question.options;
  if (question.type === "yes_no") return ["Yes", "No"];
  if (question.type === "rating") return RATING_VALUES;
  return [];
}

// The summary card of one question: bars for questions with fixed answers,
// an average for ratings and numbers, the latest answers for text questions.
function QuestionSummary(props: {
  number: number;
  question: Question;
  stats: FormStats;
  responses: FormResponse[];
}) {
  const { question, stats } = props;
  const type = QUESTION_TYPES[question.type];
  const questionStats = stats.questions.find((item) => item.question_id === question.id);
  const answered = questionStats?.answered ?? 0;
  const barLabels = fixedAnswers(question);

  // Text questions: responses are already newest first, so these are the 5 latest answers.
  const latestAnswers = props.responses
    .map((response) => response.answers[question.id])
    .filter((answer) => answer !== undefined)
    .slice(0, 5);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-6 w-12 shrink-0 items-center justify-between rounded px-1.5 text-xs font-medium"
          style={{ background: type.color }}
        >
          <type.icon size={12} />
          {props.number}
        </span>
        <div className="min-w-0">
          <h2 className="font-medium">{question.title}</h2>
          <p className="text-sm text-neutral-500">
            {answered} out of {stats.responses} people answered this question
            {questionStats?.average != null && ` · Average ${questionStats.average}`}
          </p>
        </div>
      </div>

      {barLabels.length > 0 && (
        <div className="mt-4">
          {barLabels.map((label) => (
            <Bar
              key={label}
              label={question.type === "rating" ? `${label} star${label === "1" ? "" : "s"}` : label}
              count={questionStats?.counts[label] ?? 0}
              total={answered}
            />
          ))}
        </div>
      )}

      {barLabels.length === 0 && question.type !== "number" && latestAnswers.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 text-sm">
          {latestAnswers.map((answer, i) => (
            <li key={i} className="truncate rounded-md bg-neutral-50 px-3 py-2">
              {answer}
            </li>
          ))}
          {answered > latestAnswers.length && (
            <li className="px-3 pt-1 text-neutral-500">
              and {answered - latestAnswers.length} more in the Responses tab
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

// One horizontal bar: label on the left, the bar, then the count and percentage.
// The bar's width is the share of the people who answered the question.
function Bar(props: { label: string; count: number; total: number }) {
  const percent = props.total > 0 ? Math.round((100 * props.count) / props.total) : 0;

  return (
    <div
      className="grid grid-cols-[minmax(0,10rem)_1fr_5.5rem] items-center gap-3 py-1 text-sm"
      title={`${props.label}: ${props.count} of ${props.total} (${percent}%)`}
    >
      <span className="truncate">{props.label}</span>
      {/* The left border is the baseline that every bar grows from. */}
      <div className="border-l border-neutral-300 py-0.5">
        <div className="h-4 rounded-r bg-[#0445af]" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-right text-neutral-500">
        {props.count} · {percent}%
      </span>
    </div>
  );
}
