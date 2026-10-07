// Everything the frontend knows about the backend: the data types and one function per endpoint.

// The replace() drops a trailing "/" so "https://api.example.com/" works too.
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export type Question = {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  required: boolean;
  options: string[]; // only used by multiple_choice and dropdown
};

export type Form = {
  id: string;
  title: string;
  is_published: boolean;
  theme: string;
  thank_you_message: string;
  questions: Question[];
};

// One row of the dashboard list.
export type FormSummary = {
  id: string;
  title: string;
  is_published: boolean;
  theme: string;
  updated_at: string;
  response_count: number;
  completion_rate: number;
};

// question id -> what the person answered. Every answer is a string.
export type Answers = Record<string, string>;

export type FormResponse = {
  id: number;
  submitted_at: string;
  answers: Answers;
};

export type QuestionStats = {
  question_id: string;
  answered: number;
  counts: Record<string, number>; // answer -> times chosen
  average: number | null;
};

export type FormStats = {
  starts: number;
  responses: number;
  completion_rate: number;
  questions: QuestionStats[];
};

// Thrown when the server answers with an error status.
// `detail` is the server's message, or for a rejected submission {question id: message}.
export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(API_URL + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, data?.detail ?? "Request failed");
  }
  if (response.status === 204) return undefined as T; // 204 = success with no body
  return response.json();
}

export const api = {
  // Creator side
  listForms: () => request<FormSummary[]>("/api/forms"),
  createForm: (title: string) => request<Form>("/api/forms", "POST", { title }),
  getForm: (id: string) => request<Form>(`/api/forms/${id}`),
  saveForm: (form: Form) => request<Form>(`/api/forms/${form.id}`, "PUT", form),
  updateForm: (id: string, changes: { title?: string; is_published?: boolean }) =>
    request<Form>(`/api/forms/${id}`, "PATCH", changes),
  deleteForm: (id: string) => request<void>(`/api/forms/${id}`, "DELETE"),
  duplicateForm: (id: string) => request<Form>(`/api/forms/${id}/duplicate`, "POST"),

  // Respondent side (no login)
  getPublicForm: (id: string) => request<Form>(`/api/public/forms/${id}`),
  startForm: (id: string) => request<void>(`/api/public/forms/${id}/start`, "POST"),
  submitResponse: (id: string, answers: Answers) =>
    request<{ id: number }>(`/api/public/forms/${id}/responses`, "POST", { answers }),

  // Results
  listResponses: (id: string) => request<FormResponse[]>(`/api/forms/${id}/responses`),
  getStats: (id: string) => request<FormStats>(`/api/forms/${id}/stats`),
  csvUrl: (id: string) => `${API_URL}/api/forms/${id}/responses.csv`,
};
