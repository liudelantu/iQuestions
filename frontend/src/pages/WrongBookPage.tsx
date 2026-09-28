import { Link } from 'react-router-dom'
import { api } from '../api'
import QuestionItem from '../components/QuestionItem'
import { useToast } from '../components/Toast'
import { EmptyState, ErrorBanner, PageHeader, Spinner } from '../components/ui'
import { useAsync } from '../hooks'
import type { Question } from '../types'

export default function WrongBookPage() {
  const toast = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => api.wrongBook(), [])

  const remove = async (q: Question) => {
    try {
      await api.removeWrong(q.id)
      setData((d) => (d ? d.filter((x) => x.question.id !== q.id) : d))
      toast.success('已从错题本移除')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const clearAll = async () => {
    if (!window.confirm('确定清空错题本吗？答题记录不会被删除。')) return
    try {
      await api.clearWrongBook()
      setData([])
      toast.success('错题本已清空')
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const toggleFavorite = async (q: Question) => {
    try {
      const updated = await api.setFavorite(q.id, !q.is_favorite)
      setData((d) => (d ? d.map((x) => (x.question.id === q.id ? { ...x, question: updated } : x)) : d))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (loading) return <Spinner />
  if (error || !data) return <ErrorBanner message={error ?? '加载失败'} onRetry={reload} />

  return (
    <>
      <PageHeader
        title="错题本"
        description={`共 ${data.length} 道错题，做错的题目会自动加入；在「错题重练」中答对即自动移出`}
        actions={
          data.length > 0 && (
            <>
              <button className="btn-danger" onClick={clearAll}>
                清空错题本
              </button>
              <Link to="/practice?mode=wrong_book" className="btn-primary">
                错题重练 →
              </Link>
            </>
          )
        }
      />
      {data.length === 0 ? (
        <EmptyState
          title="错题本是空的"
          description="做错的题目会自动出现在这里，方便集中巩固。"
          action={
            <Link to="/practice" className="btn-primary">
              去刷题
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.map((item, i) => (
            <QuestionItem
              key={item.question.id}
              question={item.question}
              index={i + 1}
              onToggleFavorite={toggleFavorite}
              extra={
                <span className="badge bg-rose-50 text-rose-700" title={`最近做错：${item.last_wrong_at}`}>
                  错 {item.wrong_count} 次
                </span>
              }
              actions={
                <button className="btn-ghost !px-2 !py-1 text-slate-500" onClick={() => remove(item.question)}>
                  移除
                </button>
              }
            />
          ))}
        </ul>
      )}
    </>
  )
}
