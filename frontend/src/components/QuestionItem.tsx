import { useState, type ReactNode } from 'react'
import type { Question } from '../types'
import { DifficultyBadge, Tag, TypeBadge } from './ui'

interface Props {
  question: Question
  index?: number
  extra?: ReactNode
  actions?: ReactNode
  onToggleFavorite?: (q: Question) => void
}

export default function QuestionItem({ question: q, index, extra, actions, onToggleFavorite }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <li className="card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {index !== undefined && <span className="mt-0.5 w-6 shrink-0 text-sm text-slate-400">{index}.</span>}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <TypeBadge type={q.type} />
            <DifficultyBadge difficulty={q.difficulty} />
            <span className="badge bg-slate-100 text-slate-600">{q.category}</span>
            {q.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
            {extra}
          </div>
          <button
            type="button"
            className="text-left text-sm font-medium leading-relaxed text-slate-900 hover:text-indigo-700 whitespace-pre-wrap"
            onClick={() => setOpen((o) => !o)}
          >
            {q.title}
          </button>
          <div className="mt-1 text-xs text-slate-400">
            作答 {q.attempt_count} 次 · 错误 {q.wrong_count} 次
            <button className="ml-2 text-indigo-600 hover:underline" onClick={() => setOpen((o) => !o)}>
              {open ? '收起' : '查看答案与解析'}
            </button>
          </div>

          {open && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
              {q.content && <pre className="mb-3 whitespace-pre-wrap font-sans text-slate-700">{q.content}</pre>}
              {q.type === 'fill_blank' ? (
                <ol className="space-y-1">
                  {q.fill_answers?.map((g, i) => (
                    <li key={i}>
                      <span className="text-slate-500">第 {i + 1} 空：</span>
                      <span className="font-medium text-emerald-700">{g.join(' / ')}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="space-y-1">
                  {q.options.map((o) => (
                    <li key={o.id} className={o.is_correct ? 'font-medium text-emerald-700' : 'text-slate-600'}>
                      {o.label}. {o.content} {o.is_correct && '✓'}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 border-t border-slate-200 pt-2 text-slate-700 whitespace-pre-wrap">
                <span className="font-medium">解析：</span>
                {q.explanation || '暂无解析'}
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
          {onToggleFavorite && (
            <button
              className={`btn-ghost !px-2 !py-1 ${q.is_favorite ? 'text-amber-500' : 'text-slate-400'}`}
              title={q.is_favorite ? '取消收藏' : '收藏'}
              onClick={() => onToggleFavorite(q)}
            >
              {q.is_favorite ? '★' : '☆'}
            </button>
          )}
          {actions}
        </div>
      </div>
    </li>
  )
}
