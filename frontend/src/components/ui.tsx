import { useEffect, type ReactNode } from 'react'
import { DIFFICULTY_LABELS, TYPE_LABELS, type Difficulty, type QuestionType } from '../types'

export function TypeBadge({ type }: { type: QuestionType }) {
  const colors: Record<QuestionType, string> = {
    single: 'bg-sky-50 text-sky-700',
    multiple: 'bg-violet-50 text-violet-700',
    true_false: 'bg-amber-50 text-amber-700',
    fill_blank: 'bg-teal-50 text-teal-700',
  }
  return <span className={`badge ${colors[type]}`}>{TYPE_LABELS[type]}</span>
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const colors: Record<Difficulty, string> = {
    easy: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-orange-50 text-orange-700',
    hard: 'bg-rose-50 text-rose-700',
  }
  return <span className={`badge ${colors[difficulty]}`}>{DIFFICULTY_LABELS[difficulty]}</span>
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="badge bg-slate-100 text-slate-600">#{children}</span>
}

export function Spinner({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      {label}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-2xl">
        📭
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center">
      <span>{message}</span>
      {onRetry && (
        <button className="btn-secondary !py-1" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button className="btn-ghost !px-2 !py-1 text-lg leading-none" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
      <span>
        共 {total} 题 · 第 {page} / {pages} 页
      </span>
      <div className="flex gap-2">
        <button className="btn-secondary !py-1" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          上一页
        </button>
        <button className="btn-secondary !py-1" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          下一页
        </button>
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function formatPercent(v: number): string {
  return `${Math.round(v * 1000) / 10}%`
}
