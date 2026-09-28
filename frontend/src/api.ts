import type {
  AnswerResult,
  ImportResult,
  Meta,
  PracticeMode,
  PracticeQuestion,
  Question,
  QuestionFilters,
  QuestionInput,
  QuestionPage,
  StatsOverview,
  UserAnswer,
  WrongBookItem,
} from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError(0, '无法连接后端服务，请确认后端已启动（默认 http://127.0.0.1:8000）')
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? (data as { detail: unknown }).detail
        : data
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail ?? `HTTP ${res.status}`)
    throw new ApiError(res.status, message)
  }
  return data as T
}

function qs(params: object): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  meta: () => request<Meta>('/api/meta'),

  listQuestions: (filters: QuestionFilters, page = 1, pageSize = 20, order: 'id' | 'newest' = 'newest') =>
    request<QuestionPage>(
      `/api/questions${qs({ ...filters, page, page_size: pageSize, order })}`,
    ),
  getQuestion: (id: number) => request<Question>(`/api/questions/${id}`),
  createQuestion: (body: QuestionInput) =>
    request<Question>('/api/questions', { method: 'POST', body: JSON.stringify(body) }),
  updateQuestion: (id: number, body: QuestionInput) =>
    request<Question>(`/api/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteQuestion: (id: number) => request<void>(`/api/questions/${id}`, { method: 'DELETE' }),
  importQuestions: (items: unknown) =>
    request<ImportResult>('/api/questions/import', { method: 'POST', body: JSON.stringify(items) }),

  setFavorite: (id: number, favorite: boolean) =>
    request<Question>(`/api/questions/${id}/favorite`, { method: favorite ? 'PUT' : 'DELETE' }),

  practiceQuestions: (params: { mode: PracticeMode; limit: number } & QuestionFilters) =>
    request<PracticeQuestion[]>(`/api/practice/questions${qs(params)}`),
  submitAnswer: (question_id: number, answer: UserAnswer, mode: PracticeMode) =>
    request<AnswerResult>('/api/practice/answer', {
      method: 'POST',
      body: JSON.stringify({ question_id, answer, mode }),
    }),

  wrongBook: (filters: QuestionFilters = {}) => request<WrongBookItem[]>(`/api/wrong-book${qs(filters)}`),
  removeWrong: (id: number) => request<void>(`/api/wrong-book/${id}`, { method: 'DELETE' }),
  clearWrongBook: () => request<{ removed: number }>('/api/wrong-book', { method: 'DELETE' }),

  stats: () => request<StatsOverview>('/api/stats/overview'),
}
