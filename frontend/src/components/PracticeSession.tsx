import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { MODE_LABELS, type AnswerResult, type PracticeMode, type PracticeQuestion, type UserAnswer } from '../types'
import { useToast } from './Toast'
import { DifficultyBadge, Tag, TypeBadge } from './ui'

interface Props {
  questions: PracticeQuestion[]
  mode: PracticeMode
  onExit: () => void
  onRestart: (subset?: PracticeQuestion[]) => void
}

type Draft = number[] | string[]

function emptyDraft(q: PracticeQuestion): Draft {
  return q.type === 'fill_blank' ? Array.from({ length: q.blank_count }, () => '') : []
}

function draftReady(q: PracticeQuestion, d: Draft): boolean {
  if (q.type === 'fill_blank') return (d as string[]).every((s) => s.trim().length > 0)
  return d.length > 0
}

export default function PracticeSession({ questions, mode, onExit, onRestart }: Props) {
  const toast = useToast()
  const [index, setIndex] = useState(0)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [results, setResults] = useState<Record<number, AnswerResult>>({})
  const [favorites, setFavorites] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.is_favorite])),
  )
  const [submitting, setSubmitting] = useState(false)
  const [finished, setFinished] = useState(false)

  const q = questions[index]
  const draft = (q && drafts[q.id]) ?? (q ? emptyDraft(q) : [])
  const result = q ? results[q.id] : undefined
  const answeredCount = Object.keys(results).length
  const correctCount = Object.values(results).filter((r) => r.is_correct).length

  const setDraft = (d: Draft) => setDrafts((prev) => ({ ...prev, [q.id]: d }))

  const toggleOption = (optionId: number) => {
    if (result) return
    if (q.type === 'multiple') {
      const cur = draft as number[]
      setDraft(cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId].sort((a, b) => a - b))
    } else {
      setDraft([optionId])
    }
  }

  const submit = useCallback(async () => {
    if (!q || result || submitting || !draftReady(q, draft)) return
    setSubmitting(true)
    try {
      const r = await api.submitAnswer(q.id, draft as UserAnswer, mode)
      setResults((prev) => ({ ...prev, [q.id]: r }))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }, [q, result, submitting, draft, mode, toast])

  const next = useCallback(() => {
    if (index + 1 >= questions.length) setFinished(true)
    else setIndex((i) => i + 1)
  }, [index, questions.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || finished) return
      const target = e.target as HTMLElement | null
      if (target && target.tagName === 'TEXTAREA') return
      e.preventDefault()
      if (result) next()
      else void submit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [finished, result, next, submit])

  const toggleFavorite = async () => {
    const nextVal = !favorites[q.id]
    try {
      await api.setFavorite(q.id, nextVal)
      setFavorites((f) => ({ ...f, [q.id]: nextVal }))
      toast.success(nextVal ? '已收藏' : '已取消收藏')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const wrongQuestions = useMemo(
    () => questions.filter((x) => results[x.id] && !results[x.id].is_correct),
    [questions, results],
  )

  if (finished) {
    const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0
    return (
      <div className="card mx-auto max-w-2xl p-6 sm:p-8">
        <div className="text-center">
          <div className="text-sm text-slate-500">{MODE_LABELS[mode]} · 本轮完成</div>
          <div className="mt-3 text-5xl font-bold tracking-tight text-indigo-600">{accuracy}%</div>
          <div className="mt-2 text-slate-600">
            共 {questions.length} 题，作答 {answeredCount} 题，正确 {correctCount} 题
          </div>
        </div>
        {wrongQuestions.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">本轮做错的题目（已自动加入错题本）</h3>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {wrongQuestions.map((w, i) => (
                <li key={w.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                  <span className="mt-0.5 text-slate-400">{i + 1}.</span>
                  <span className="flex-1 text-slate-700">{w.title}</span>
                  <TypeBadge type={w.type} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button className="btn-primary" onClick={() => onRestart()}>
            再练一遍
          </button>
          {wrongQuestions.length > 0 && (
            <button className="btn-secondary" onClick={() => onRestart(wrongQuestions)}>
              只练本轮错题
            </button>
          )}
          <button className="btn-ghost" onClick={onExit}>
            返回设置
          </button>
        </div>
      </div>
    )
  }

  const isChoice = q.type !== 'fill_blank'
  const correctSet = new Set(result?.correct_option_ids ?? [])
  const selectedSet = new Set(isChoice ? (draft as number[]) : [])

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <button className="btn-ghost !px-2 !py-1" onClick={onExit}>
            ← 退出
          </button>
          <span>
            {MODE_LABELS[mode]} · 第 {index + 1} / {questions.length} 题
          </span>
        </div>
        <span>
          已答 {answeredCount} · 正确 {correctCount}
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all"
          style={{ width: `${((index + (result ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="card p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TypeBadge type={q.type} />
          <DifficultyBadge difficulty={q.difficulty} />
          <span className="badge bg-slate-100 text-slate-600">{q.category}</span>
          {q.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
          <button
            className={`ml-auto btn-ghost !px-2 !py-1 ${favorites[q.id] ? 'text-amber-500' : 'text-slate-400'}`}
            onClick={toggleFavorite}
            title={favorites[q.id] ? '取消收藏' : '收藏此题'}
          >
            {favorites[q.id] ? '★ 已收藏' : '☆ 收藏'}
          </button>
        </div>

        <h2 className="text-lg font-semibold leading-relaxed text-slate-900 whitespace-pre-wrap">{q.title}</h2>
        {q.content && (
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm text-slate-700">
            {q.content}
          </pre>
        )}
        {q.type === 'multiple' && !result && <p className="mt-2 text-xs text-slate-500">多选题：请选择所有正确选项</p>}

        {isChoice ? (
          <ul className="mt-5 space-y-2.5">
            {q.options.map((o) => {
              const selected = selectedSet.has(o.id)
              const correct = correctSet.has(o.id)
              let cls = 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
              if (result) {
                if (correct) cls = 'border-emerald-400 bg-emerald-50'
                else if (selected) cls = 'border-rose-400 bg-rose-50'
                else cls = 'border-slate-200 opacity-70'
              } else if (selected) {
                cls = 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
              }
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    disabled={!!result}
                    onClick={() => toggleOption(o.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${cls}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold ${
                        q.type === 'multiple' ? 'rounded-md' : 'rounded-full'
                      } ${
                        selected || (result && correct)
                          ? result
                            ? correct
                              ? 'bg-emerald-500 text-white'
                              : 'bg-rose-500 text-white'
                            : 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {o.label}
                    </span>
                    <span className="flex-1 leading-6 text-slate-800">{o.content}</span>
                    {result && correct && <span className="text-emerald-600">✓</span>}
                    {result && selected && !correct && <span className="text-rose-600">✗</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="mt-5 space-y-3">
            {(draft as string[]).map((v, i) => {
              const accepted = result?.correct_answers?.[i]
              const ok = accepted ? accepted.some((a) => a.trim().toLowerCase() === v.trim().toLowerCase()) : null
              return (
                <div key={i}>
                  <label className="mb-1 block text-xs font-medium text-slate-500">第 {i + 1} 空</label>
                  <input
                    className={`input ${
                      result ? (ok ? '!border-emerald-400 !bg-emerald-50' : '!border-rose-400 !bg-rose-50') : ''
                    }`}
                    value={v}
                    disabled={!!result}
                    autoFocus={i === 0}
                    placeholder="请输入答案"
                    onChange={(e) => {
                      const nextDraft = [...(draft as string[])]
                      nextDraft[i] = e.target.value
                      setDraft(nextDraft)
                    }}
                  />
                  {result && accepted && (
                    <div className="mt-1 text-xs text-slate-500">
                      参考答案：<span className="font-medium text-emerald-700">{accepted.join(' / ')}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {result && (
          <div
            className={`mt-5 rounded-lg border p-4 ${
              result.is_correct ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className={`font-semibold ${result.is_correct ? 'text-emerald-700' : 'text-rose-700'}`}>
              {result.is_correct ? '回答正确 🎉' : '回答错误'}
              {!result.is_correct && result.in_wrong_book && (
                <span className="ml-2 text-xs font-normal text-rose-600">已加入错题本</span>
              )}
              {result.is_correct && mode === 'wrong_book' && !result.in_wrong_book && (
                <span className="ml-2 text-xs font-normal text-emerald-600">已从错题本移除</span>
              )}
            </div>
            {isChoice && (
              <div className="mt-1 text-sm text-slate-600">
                正确答案：
                <span className="font-medium">
                  {q.options
                    .filter((o) => correctSet.has(o.id))
                    .map((o) => o.label)
                    .join('、')}
                </span>
              </div>
            )}
            <div className="mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              <span className="font-medium text-slate-800">解析：</span>
              {result.explanation || '暂无解析'}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">提示：按 Enter 可快速{result ? '进入下一题' : '提交'}</span>
          <div className="flex gap-2">
            {index > 0 && (
              <button className="btn-secondary" onClick={() => setIndex((i) => i - 1)}>
                上一题
              </button>
            )}
            {result ? (
              <button className="btn-primary" onClick={next}>
                {index + 1 >= questions.length ? '查看结果' : '下一题 →'}
              </button>
            ) : (
              <>
                <button className="btn-ghost" onClick={next}>
                  跳过
                </button>
                <button className="btn-primary" disabled={!draftReady(q, draft) || submitting} onClick={submit}>
                  {submitting ? '提交中…' : '提交答案'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
