import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import QuestionItem from '../components/QuestionItem'
import { useToast } from '../components/Toast'
import { EmptyState, ErrorBanner, PageHeader, Pagination, Spinner } from '../components/ui'
import { useAsync } from '../hooks'
import type { Question } from '../types'

const PAGE_SIZE = 10

export default function FavoritesPage() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const { data, loading, error, reload, setData } = useAsync(
    () => api.listQuestions({ favorite: true }, page, PAGE_SIZE, 'newest'),
    [page],
  )

  const unfavorite = async (q: Question) => {
    try {
      await api.setFavorite(q.id, false)
      setData((d) => (d ? { ...d, total: d.total - 1, items: d.items.filter((x) => x.id !== q.id) } : d))
      toast.success('已取消收藏')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (loading && !data) return <Spinner />
  if (error || !data) return <ErrorBanner message={error ?? '加载失败'} onRetry={reload} />

  return (
    <>
      <PageHeader
        title="我的收藏"
        description={`共收藏 ${data.total} 道题目`}
        actions={
          data.total > 0 && (
            <Link to="/practice?mode=favorites" className="btn-primary">
              练习收藏题 →
            </Link>
          )
        }
      />
      {data.items.length === 0 ? (
        <EmptyState
          title="还没有收藏任何题目"
          description="刷题或浏览题库时点击 ☆ 即可收藏，方便日后重点复习。"
          action={
            <Link to="/questions" className="btn-primary">
              浏览题库
            </Link>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((q, i) => (
              <QuestionItem key={q.id} question={q} index={(page - 1) * PAGE_SIZE + i + 1} onToggleFavorite={unfavorite} />
            ))}
          </ul>
          <div className="mt-4">
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
          </div>
        </>
      )}
    </>
  )
}
