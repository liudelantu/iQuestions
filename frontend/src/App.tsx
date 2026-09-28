import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/', label: '统计概览', icon: '📊' },
  { to: '/practice', label: '开始刷题', icon: '✏️' },
  { to: '/questions', label: '题库管理', icon: '📚' },
  { to: '/wrong-book', label: '错题本', icon: '❌' },
  { to: '/favorites', label: '我的收藏', icon: '⭐' },
]

export default function App() {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white">
            iQ
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">iQuestions</div>
            <div className="text-xs text-slate-500">本地刷题系统</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span aria-hidden>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 text-xs text-slate-400">数据仅保存在本机 SQLite 文件中</div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          iQ
        </div>
        <span className="text-base font-semibold text-slate-900">iQuestions</span>
      </header>

      <main className="flex-1 pb-24 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? 'text-indigo-600' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg leading-none" aria-hidden>
              {n.icon}
            </span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
