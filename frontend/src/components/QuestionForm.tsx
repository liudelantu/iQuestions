import { useState, type FormEvent } from 'react'
import {
  DIFFICULTY_LABELS,
  TYPE_LABELS,
  type Difficulty,
  type Question,
  type QuestionInput,
  type QuestionType,
} from '../types'

interface Props {
  initial?: Question | null
  categories: string[]
  submitting: boolean
  onSubmit: (body: QuestionInput) => void
  onCancel: () => void
}

interface FormState {
  type: QuestionType
  title: string
  content: string
  options: { content: string; is_correct: boolean }[]
  blanks: string[] // 每个空的可接受答案，用 | 分隔
  explanation: string
  difficulty: Difficulty
  category: string
  tags: string
  source_id: string
}

const TF_OPTIONS = [
  { content: '正确', is_correct: true },
  { content: '错误', is_correct: false },
]

function fromQuestion(q: Question | null | undefined): FormState {
  if (!q) {
    return {
      type: 'single',
      title: '',
      content: '',
      options: [
        { content: '', is_correct: true },
        { content: '', is_correct: false },
        { content: '', is_correct: false },
        { content: '', is_correct: false },
      ],
      blanks: [''],
      explanation: '',
      difficulty: 'medium',
      category: '',
      tags: '',
      source_id: '',
    }
  }
  return {
    type: q.type,
    title: q.title,
    content: q.content ?? '',
    options: q.type === 'fill_blank' ? TF_OPTIONS.map((o) => ({ ...o })) : q.options.map((o) => ({ content: o.content, is_correct: o.is_correct })),
    blanks: q.fill_answers?.map((g) => g.join(' | ')) ?? [''],
    explanation: q.explanation ?? '',
    difficulty: q.difficulty,
    category: q.category,
    tags: q.tags.join(', '),
    source_id: q.source_id ?? '',
  }
}

export default function QuestionForm({ initial, categories, submitting, onSubmit, onCancel }: Props) {
  const [f, setF] = useState<FormState>(() => fromQuestion(initial))
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }))

  const changeType = (t: QuestionType) => {
    setF((s) => {
      let options = s.options
      if (t === 'true_false') options = TF_OPTIONS.map((o) => ({ ...o }))
      else if (s.type === 'true_false') options = fromQuestion(null).options
      if (t === 'single' && options.filter((o) => o.is_correct).length > 1) {
        const first = options.findIndex((o) => o.is_correct)
        options = options.map((o, i) => ({ ...o, is_correct: i === first }))
      }
      return { ...s, type: t, options }
    })
  }

  const setCorrect = (i: number, checked: boolean) => {
    setF((s) => ({
      ...s,
      options: s.options.map((o, j) =>
        s.type === 'multiple' ? (j === i ? { ...o, is_correct: checked } : o) : { ...o, is_correct: j === i },
      ),
    }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const isFill = f.type === 'fill_blank'
    const body: QuestionInput = {
      type: f.type,
      title: f.title.trim(),
      content: f.content.trim() || null,
      options: isFill ? [] : f.options.map((o) => ({ content: o.content.trim(), is_correct: o.is_correct })),
      fill_answers: isFill
        ? f.blanks.map((b) =>
            b
              .split('|')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        : null,
      explanation: f.explanation.trim() || null,
      difficulty: f.difficulty,
      category: f.category.trim() || '未分类',
      tags: f.tags
        .split(/[,，、\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      source_id: f.source_id.trim() || null,
    }
    if (!body.title) return setError('请填写题干')
    if (!isFill) {
      if (body.options.some((o) => !o.content)) return setError('选项内容不能为空')
      const correct = body.options.filter((o) => o.is_correct).length
      if (f.type === 'multiple' && correct < 1) return setError('多选题至少勾选 1 个正确选项')
      if (f.type !== 'multiple' && correct !== 1) return setError('请选择唯一的正确选项')
    } else if (body.fill_answers!.some((g) => g.length === 0)) {
      return setError('每个空至少需要一个参考答案')
    }
    onSubmit(body)
  }

  const isFill = f.type === 'fill_blank'
  const isTF = f.type === 'true_false'

  return (
    <form id="question-form" onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-700">题型</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                f.type === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">
          题干 <span className="text-rose-500">*</span>
          {isFill && <span className="ml-2 text-xs font-normal text-slate-400">建议用 ____ 标记空位</span>}
        </span>
        <textarea className="input min-h-20" value={f.title} onChange={(e) => set('title', e.target.value)} required />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">补充材料（可选）</span>
        <textarea className="input min-h-16" value={f.content} onChange={(e) => set('content', e.target.value)} placeholder="代码片段、阅读材料等" />
      </label>

      {isFill ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              各空答案 <span className="text-rose-500">*</span>
            </span>
            <span className="text-xs text-slate-400">多个可接受答案用 | 分隔，如：4 | 四</span>
          </div>
          <div className="space-y-2">
            {f.blanks.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-slate-500">第 {i + 1} 空</span>
                <input
                  className="input"
                  value={b}
                  onChange={(e) => set('blanks', f.blanks.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <button
                  type="button"
                  className="btn-ghost !px-2"
                  disabled={f.blanks.length <= 1}
                  onClick={() => set('blanks', f.blanks.filter((_, j) => j !== i))}
                  aria-label="删除此空"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-secondary mt-2 !py-1" disabled={f.blanks.length >= 20} onClick={() => set('blanks', [...f.blanks, ''])}>
            + 添加一个空
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              选项 <span className="text-rose-500">*</span>
            </span>
            <span className="text-xs text-slate-400">{f.type === 'multiple' ? '勾选所有正确选项' : '点选唯一正确选项'}</span>
          </div>
          <div className="space-y-2">
            {f.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type={f.type === 'multiple' ? 'checkbox' : 'radio'}
                  name="correct"
                  checked={o.is_correct}
                  onChange={(e) => setCorrect(i, e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                  aria-label={`选项 ${String.fromCharCode(65 + i)} 为正确答案`}
                />
                <span className="w-5 text-sm font-medium text-slate-500">{String.fromCharCode(65 + i)}</span>
                <input
                  className="input"
                  value={o.content}
                  readOnly={isTF}
                  onChange={(e) => set('options', f.options.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))}
                />
                {!isTF && (
                  <button
                    type="button"
                    className="btn-ghost !px-2"
                    disabled={f.options.length <= 2}
                    onClick={() => set('options', f.options.filter((_, j) => j !== i))}
                    aria-label="删除选项"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isTF && (
            <button
              type="button"
              className="btn-secondary mt-2 !py-1"
              disabled={f.options.length >= 10}
              onClick={() => set('options', [...f.options, { content: '', is_correct: false }])}
            >
              + 添加选项
            </button>
          )}
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">解析</span>
        <textarea className="input min-h-16" value={f.explanation} onChange={(e) => set('explanation', e.target.value)} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">难度</span>
          <select className="input" value={f.difficulty} onChange={(e) => set('difficulty', e.target.value as Difficulty)}>
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">分类</span>
          <input className="input" list="category-list" value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="如：Python 基础" />
          <datalist id="category-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">标签</span>
          <input className="input" value={f.tags} onChange={(e) => set('tags', e.target.value)} placeholder="用逗号分隔，如：基础, 函数" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">来源编号（可选）</span>
          <input className="input" value={f.source_id} onChange={(e) => set('source_id', e.target.value)} placeholder="外部题号，需唯一" />
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '保存中…' : initial ? '保存修改' : '创建题目'}
        </button>
      </div>
    </form>
  )
}
