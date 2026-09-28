import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import PracticeSession from '../components/PracticeSession'
import { useToast } from '../components/Toast'
import { ErrorBanner, PageHeader, Spinner } from '../components/ui'
import { useMeta } from '../hooks'
import {
  DIFFICULTY_LABELS,
  MODE_LABELS,
  TYPE_LABELS,
  type Difficulty,
  type PracticeMode,
  type PracticeQuestion,
  type QuestionType,
} from '../types'

const MODES: PracticeMode[] = ['sequential', 'random', 'wrong_book', 'favorites']
const MODE_DESC: Record<PracticeMode, string> = {
  sequential: '按题库顺序依次练习',
  random: '随机打乱题目顺序',
  wrong_book: '重练错题，答对后自动移出错题本',
  favorites: '只练习已收藏的题目',
}

export default function PracticePage() {
  const [params, setParams] = useSearchParams()
  const { data: meta, loading: metaLoading, error: metaError, reload } = useMeta()
  const toast = useToast()

  const mode = (params.get('mode') as PracticeMode) || 'sequential'
  const type = (params.get('type') as QuestionType) || ''
  const category = params.get('category') || ''
  const tag = params.get('tag') || ''
  const difficulty = (params.get('difficulty') as Difficulty) || ''
  const limit = Number(params.get('limit') || 20)

  const [session, setSession] = useState<{ questions: PracticeQuestion[]; mode: PracticeMode } | null>(null)
  const [starting, setStarting] = useState(false)

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    setParams(next, { replace: true })
  }

  const start = async () => {
    setStarting(true)
    try {
      const questions = await api.practiceQuestions({
        mode,
        limit,
        type: type || undefined,
        category: category || undefined,
        tag: tag || undefined,
        difficulty: difficulty || undefined,
      })
      if (questions.length === 0) {
        toast.info(
          mode === 'wrong_book'
            ? '错题本为空，或没有符合筛选条件的错题'
            : mode === 'favorites'
              ? '还没有收藏的题目'
              : '没有符合条件的题目，请调整筛选条件',
        )
        return
      }
      setSession({ questions, mode })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setStarting(false)
    }
  }

  if (session) {
    return (
      <PracticeSession
        key={session.questions.map((q) => q.id).join(',')}
        questions={session.questions}
        mode={session.mode}
        onExit={() => setSession(null)}
        onRestart={(subset) => {
          const qs = subset ?? session.questions
          setSession({ questions: session.mode === 'random' ? [...qs].sort(() => Math.random() - 0.5) : qs, mode: session.mode })
        }}
      />
    )
  }

  if (metaLoading) return <Spinner />
  if (metaError || !meta) return <ErrorBanner message={metaError ?? '加载失败'} onRetry={reload} />

  const filterHint =
    mode === 'wrong_book' || mode === 'favorites' ? '筛选条件同样适用于错题 / 收藏范围内的题目' : undefined

  return (
    <>
      <PageHeader title="开始刷题" description="选择练习模式和筛选条件，答题后即时判分并显示解析" />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-800">练习模式</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update({ mode: m })}
                className={`rounded-xl border p-4 text-left transition ${
                  mode === m
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="font-medium text-slate-800">{MODE_LABELS[m]}</div>
                <div className="mt-1 text-xs text-slate-500">{MODE_DESC[m]}</div>
              </button>
            ))}
          </div>

          <h2 className="mb-3 mt-6 font-semibold text-slate-800">筛选条件</h2>
          {filterHint && <p className="mb-3 text-xs text-slate-500">{filterHint}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">题型</span>
              <select className="input" value={type} onChange={(e) => update({ type: e.target.value })}>
                <option value="">全部题型</option>
                {meta.types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {TYPE_LABELS[t.value]}（{t.count}）
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">难度</span>
              <select className="input" value={difficulty} onChange={(e) => update({ difficulty: e.target.value })}>
                <option value="">全部难度</option>
                {meta.difficulties.map((d) => (
                  <option key={d.value} value={d.value}>
                    {DIFFICULTY_LABELS[d.value]}（{d.count}）
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">分类</span>
              <select className="input" value={category} onChange={(e) => update({ category: e.target.value })}>
                <option value="">全部分类</option>
                {meta.categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}（{c.count}）
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">标签</span>
              <select className="input" value={tag} onChange={(e) => update({ tag: e.target.value })}>
                <option value="">全部标签</option>
                {meta.tags.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}（{t.count}）
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">题目数量上限</span>
              <select className="input" value={String(limit)} onChange={(e) => update({ limit: e.target.value })}>
                {[5, 10, 20, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n} 题
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <aside className="card flex flex-col p-5">
          <h2 className="font-semibold text-slate-800">本次练习</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">模式</dt>
              <dd className="font-medium text-slate-800">{MODE_LABELS[mode]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">题型</dt>
              <dd className="font-medium text-slate-800">{type ? TYPE_LABELS[type] : '全部'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">难度</dt>
              <dd className="font-medium text-slate-800">{difficulty ? DIFFICULTY_LABELS[difficulty] : '全部'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">分类</dt>
              <dd className="font-medium text-slate-800">{category || '全部'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">标签</dt>
              <dd className="font-medium text-slate-800">{tag || '全部'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">数量上限</dt>
              <dd className="font-medium text-slate-800">{limit} 题</dd>
            </div>
          </dl>
          <div className="mt-auto pt-6">
            <button className="btn-primary w-full !py-2.5" onClick={start} disabled={starting || meta.total_questions === 0}>
              {starting ? '正在出题…' : '开始练习'}
            </button>
            {meta.total_questions === 0 && (
              <p className="mt-2 text-center text-xs text-slate-500">题库为空，请先到「题库管理」添加或导入题目</p>
            )}
            {(type || category || tag || difficulty) && (
              <button className="btn-ghost mt-2 w-full" onClick={() => update({ type: '', category: '', tag: '', difficulty: '' })}>
                清除筛选
              </button>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
