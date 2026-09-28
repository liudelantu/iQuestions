import { useState } from 'react'
import { api } from '../api'
import type { ImportResult } from '../types'
import { Modal } from './ui'

const EXAMPLE = `[
  {
    "type": "single",
    "title": "1 + 1 = ?",
    "options": [
      { "content": "1" },
      { "content": "2", "is_correct": true },
      { "content": "3" }
    ],
    "explanation": "基础算术",
    "difficulty": "easy",
    "category": "数学",
    "tags": ["加法"]
  },
  {
    "type": "multiple",
    "title": "下列哪些是偶数？",
    "options": [
      { "content": "2", "is_correct": true },
      { "content": "3" },
      { "content": "4", "is_correct": true }
    ],
    "category": "数学"
  },
  {
    "type": "true_false",
    "title": "0 是自然数。",
    "options": [
      { "content": "正确", "is_correct": true },
      { "content": "错误" }
    ],
    "category": "数学"
  },
  {
    "type": "fill_blank",
    "title": "3 × 4 = ____",
    "fill_answers": [["12", "十二"]],
    "category": "数学",
    "difficulty": "easy"
  }
]`

export default function ImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: (r: ImportResult) => void }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setText('')
    setResult(null)
    setError(null)
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    file.text().then(setText)
  }

  const submit = async () => {
    setError(null)
    setResult(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return setError('JSON 解析失败，请检查格式')
    }
    setBusy(true)
    try {
      const r = await api.importQuestions(parsed)
      setResult(r)
      if (r.imported > 0) onImported(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="批量导入题目（JSON）"
      wide
      onClose={() => {
        reset()
        onClose()
      }}
      footer={
        <>
          <button className="btn-secondary" onClick={() => setText(EXAMPLE)}>
            填入示例
          </button>
          <button className="btn-primary" disabled={busy || !text.trim()} onClick={submit}>
            {busy ? '导入中…' : '开始导入'}
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        粘贴题目数组 JSON，或选择 .json 文件。字段说明：<code className="rounded bg-slate-100 px-1">type</code>（single / multiple /
        true_false / fill_blank）、<code className="rounded bg-slate-100 px-1">title</code>、
        <code className="rounded bg-slate-100 px-1">options</code>（选择题）、
        <code className="rounded bg-slate-100 px-1">fill_answers</code>（填空题，二维数组）、
        <code className="rounded bg-slate-100 px-1">explanation</code>、<code className="rounded bg-slate-100 px-1">difficulty</code>（easy /
        medium / hard）、<code className="rounded bg-slate-100 px-1">category</code>、<code className="rounded bg-slate-100 px-1">tags</code>。
      </p>
      <input
        type="file"
        accept="application/json,.json"
        className="mb-3 block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <textarea
        className="input min-h-64 font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='[ { "type": "single", "title": "...", "options": [...] } ]'
        spellCheck={false}
      />
      {error && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {result && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="font-medium text-slate-800">
            成功导入 <span className="text-emerald-700">{result.imported}</span> 题
            {result.failed.length > 0 && (
              <>
                ，失败 <span className="text-rose-700">{result.failed.length}</span> 题
              </>
            )}
          </div>
          {result.failed.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-rose-700">
              {result.failed.map((f) => (
                <li key={f.index}>
                  第 {f.index + 1} 条：{f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}
