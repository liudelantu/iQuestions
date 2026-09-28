import { useCallback, useState } from 'react'
import { api } from '../api'
import ImportModal from '../components/ImportModal'
import QuestionForm from '../components/QuestionForm'
import QuestionItem from '../components/QuestionItem'
import { useToast } from '../components/Toast'
import { EmptyState, ErrorBanner, Modal, PageHeader, Pagination, Spinner } from '../components/ui'
import { useAsync, useMeta } from '../hooks'
import { DIFFICULTY_LABELS, TYPE_LABELS, type Difficulty, type Question, type QuestionFilters, type QuestionInput, type QuestionType } from '../types'

const PAGE_SIZE = 10

export default function QuestionsPage() {
  const toast = useToast()
  const [filters, setFilters] = useState<QuestionFilters>({})
  const [keywordDraft, setKeywordDraft] = useState('')
  const [page, setPage] = useState(1)
  const { data: meta, reload: reloadMeta } = useMeta()
  const { data, loading, error, reload, setData } = useAsync(
    () => api.listQuestions(filters, page, PAGE_SIZE, 'newest'),
    [filters, page],
  )

  const [editing, setEditing] = useState<Question | null | 'new'>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(() => {
    reload()
    reloadMeta()
  }, [reload, reloadMeta])

  const updateFilter = (patch: QuestionFilters) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  const save = async (body: QuestionInput) => {
    setSaving(true)
    try {
      if (editing === 'new') {
        await api.createQuestion(body)
        toast.success('题目已创建')
      } else if (editing) {
        await api.updateQuestion(editing.id, body)
        toast.success('题目已更新')
      }
      setEditing(null)
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (q: Question) => {
    if (!window.confirm(`确定删除这道题吗？\n\n${q.title}\n\n相关答题记录也会一并删除。`)) return
    try {
      await api.deleteQuestion(q.id)
      toast.success('已删除')
      refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const toggleFavorite = async (q: Question) => {
    try {
      const updated = await api.setFavorite(q.id, !q.is_favorite)
      setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === q.id ? updated : x)) } : d))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const hasFilter = !!(filters.type || filters.category || filters.tag || filters.difficulty || filters.keyword)

  return (
    <>
      <PageHeader
        title="题库管理"
        description={meta ? `共 ${meta.total_questions} 道题目` : undefined}
        actions={
          <>
            <button className="btn-secondary" onClick={() => setImportOpen(true)}>
              批量导入
            </button>
            <button className="btn-primary" onClick={() => setEditing('new')}>
              + 新增题目
            </button>
          </>
        }
      />

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <form
          className="flex gap-2 sm:col-span-2 lg:col-span-2"
          onSubmit={(e) => {
            e.preventDefault()
            updateFilter({ keyword: keywordDraft.trim() })
          }}
        >
          <input className="input" placeholder="搜索题干 / 解析…" value={keywordDraft} onChange={(e) => setKeywordDraft(e.target.value)} />
          <button className="btn-secondary shrink-0" type="submit">
            搜索
          </button>
        </form>
        <select className="input" value={filters.type ?? ''} onChange={(e) => updateFilter({ type: e.target.value as QuestionType | '' })}>
          <option value="">全部题型</option>
          {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select className="input" value={filters.category ?? ''} onChange={(e) => updateFilter({ category: e.target.value })}>
          <option value="">全部分类</option>
          {meta?.categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}（{c.count}）
            </option>
          ))}
        </select>
        <select className="input" value={filters.difficulty ?? ''} onChange={(e) => updateFilter({ difficulty: e.target.value as Difficulty | '' })}>
          <option value="">全部难度</option>
          {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
        {meta && meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:col-span-2 lg:col-span-5">
            <button
              className={`badge cursor-pointer ${!filters.tag ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              onClick={() => updateFilter({ tag: '' })}
            >
              全部标签
            </button>
            {meta.tags.map((t) => (
              <button
                key={t.name}
                className={`badge cursor-pointer ${filters.tag === t.name ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                onClick={() => updateFilter({ tag: filters.tag === t.name ? '' : t.name })}
              >
                #{t.name} <span className="ml-1 opacity-70">{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBanner message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title={hasFilter ? '没有符合条件的题目' : '题库还是空的'}
          description={hasFilter ? '试试调整筛选条件' : '点击右上角「新增题目」或「批量导入」开始建立题库。'}
          action={
            hasFilter ? (
              <button
                className="btn-secondary"
                onClick={() => {
                  setKeywordDraft('')
                  setFilters({})
                  setPage(1)
                }}
              >
                清除筛选
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setEditing('new')}>
                + 新增题目
              </button>
            )
          }
        />
      ) : (
        <>
          <ul className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((q, i) => (
              <QuestionItem
                key={q.id}
                question={q}
                index={(page - 1) * PAGE_SIZE + i + 1}
                onToggleFavorite={toggleFavorite}
                actions={
                  <>
                    <button className="btn-ghost !px-2 !py-1" onClick={() => setEditing(q)}>
                      编辑
                    </button>
                    <button className="btn-ghost !px-2 !py-1 text-rose-600" onClick={() => remove(q)}>
                      删除
                    </button>
                  </>
                }
              />
            ))}
          </ul>
          <div className="mt-4">
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
          </div>
        </>
      )}

      <Modal open={editing !== null} title={editing === 'new' ? '新增题目' : '编辑题目'} onClose={() => setEditing(null)} wide>
        {editing !== null && (
          <QuestionForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            categories={meta?.categories.map((c) => c.name) ?? []}
            submitting={saving}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(r) => {
          toast.success(`成功导入 ${r.imported} 道题目`)
          refresh()
        }}
      />
    </>
  )
}
