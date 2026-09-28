import { Link } from 'react-router-dom'
import { api } from '../api'
import { ErrorBanner, PageHeader, Spinner, formatPercent } from '../components/ui'
import { useAsync } from '../hooks'
import type { DayStat } from '../types'

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-bold tracking-tight ${accent ?? 'text-slate-900'}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  )
}

function TrendChart({ days }: { days: DayStat[] }) {
  const max = Math.max(1, ...days.map((d) => d.attempts))
  const weekday = ['日', '一', '二', '三', '四', '五', '六']
  return (
    <div className="flex h-48 items-end gap-2 sm:gap-4">
      {days.map((d) => {
        const total = (d.attempts / max) * 100
        const correct = d.attempts ? (d.correct / d.attempts) * total : 0
        const date = new Date(`${d.date}T00:00:00`)
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
            <div className="text-xs font-medium text-slate-600">{d.attempts || ''}</div>
            <div
              className="relative w-full max-w-10 overflow-hidden rounded-t-md bg-slate-100"
              style={{ height: '120px' }}
              title={`${d.date}：答题 ${d.attempts}，正确 ${d.correct}`}
            >
              <div className="absolute inset-x-0 bottom-0 bg-indigo-200" style={{ height: `${total}%` }} />
              <div className="absolute inset-x-0 bottom-0 bg-indigo-600" style={{ height: `${correct}%` }} />
            </div>
            <div className="text-center text-[11px] leading-tight text-slate-500">
              <div>{d.date.slice(5)}</div>
              <div>周{weekday[date.getDay()]}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const { data, loading, error, reload } = useAsync(() => api.stats(), [])

  if (loading) return <Spinner />
  if (error || !data) return <ErrorBanner message={error ?? '加载失败'} onRetry={reload} />

  const answeredCategories = data.by_category.filter((c) => c.attempts > 0)

  return (
    <>
      <PageHeader
        title="统计概览"
        description="查看整体练习情况、分类正确率与近 7 天趋势"
        actions={
          <Link to="/practice" className="btn-primary">
            开始刷题 →
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="题库总数" value={String(data.total_questions)} hint={`已作答 ${data.answered_questions} 题`} />
        <StatCard label="总答题次数" value={String(data.total_attempts)} hint={`正确 ${data.correct_attempts} 次`} />
        <StatCard
          label="总体正确率"
          value={data.total_attempts ? formatPercent(data.accuracy) : '—'}
          accent={data.accuracy >= 0.8 ? 'text-emerald-600' : data.accuracy >= 0.6 ? 'text-orange-500' : 'text-slate-900'}
        />
        <StatCard label="错题 / 收藏" value={`${data.wrong_book_count} / ${data.favorite_count}`} hint="待巩固 / 已收藏" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">近 7 天答题趋势</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <i className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-600" /> 正确
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-200" /> 答题
              </span>
            </div>
          </div>
          <TrendChart days={data.last_7_days} />
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-800">按分类正确率</h2>
          {answeredCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">还没有答题记录，去练几题吧。</p>
          ) : (
            <ul className="space-y-3">
              {answeredCategories.map((c) => (
                <li key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{c.category}</span>
                    <span className="text-slate-500">
                      {c.correct}/{c.attempts} · {formatPercent(c.accuracy)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        c.accuracy >= 0.8 ? 'bg-emerald-500' : c.accuracy >= 0.6 ? 'bg-orange-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${c.accuracy * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-4 font-semibold text-slate-800">题库分布</h2>
        <div className="flex flex-wrap gap-2">
          {data.by_category.map((c) => (
            <Link
              key={c.category}
              to={`/practice?category=${encodeURIComponent(c.category)}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-indigo-300 hover:bg-indigo-50"
            >
              <span className="font-medium text-slate-700">{c.category}</span>
              <span className="ml-2 text-slate-400">{c.question_count} 题</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
