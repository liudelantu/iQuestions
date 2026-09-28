#!/usr/bin/env node
/**
 * 一键脚本（无第三方依赖）：
 *   node scripts/run.mjs setup   安装前端 npm 依赖 + 后端 Python 依赖（自动创建 .venv）
 *   node scripts/run.mjs dev     同时启动后端 (uvicorn :8000) 与前端 (vite :5173)
 *   node scripts/run.mjs test    运行后端单元测试 + 前端类型检查/构建
 *   node scripts/run.mjs seed    向数据库写入示例题目（数据库为空时）
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FRONTEND = path.join(ROOT, 'frontend')
const BACKEND = path.join(ROOT, 'backend')
const VENV = path.join(ROOT, '.venv')
const IS_WIN = process.platform === 'win32'

const COLORS = { backend: '\x1b[36m', frontend: '\x1b[35m', reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m' }
const log = (msg) => console.log(`${COLORS.green}[iquestions]${COLORS.reset} ${msg}`)
const fail = (msg) => {
  console.error(`${COLORS.red}[iquestions] ${msg}${COLORS.reset}`)
  process.exit(1)
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: IS_WIN, ...opts })
  if (r.error) throw r.error
  return r.status ?? 1
}

function tryRun(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'pipe', shell: IS_WIN, encoding: 'utf8', ...opts })
  return !r.error && r.status === 0 ? r.stdout.trim() : null
}

/** 找到可用的 Python 解释器：优先 .venv，其次 python3 / python。 */
function findPython() {
  const venvPy = IS_WIN ? path.join(VENV, 'Scripts', 'python.exe') : path.join(VENV, 'bin', 'python')
  if (existsSync(venvPy)) return venvPy
  for (const candidate of IS_WIN ? ['python', 'py -3', 'python3'] : ['python3', 'python']) {
    const [cmd, ...args] = candidate.split(' ')
    const out = tryRun(cmd, [...args, '--version'])
    if (out && /Python 3\.(1[0-9]|[2-9][0-9])/.test(out)) return candidate
  }
  return null
}

function ensureVenv(systemPython) {
  const venvPy = IS_WIN ? path.join(VENV, 'Scripts', 'python.exe') : path.join(VENV, 'bin', 'python')
  if (existsSync(venvPy)) return venvPy
  log('正在创建 Python 虚拟环境 .venv …')
  const [cmd, ...args] = systemPython.split(' ')
  const status = run(cmd, [...args, '-m', 'venv', VENV])
  if (status === 0 && existsSync(venvPy)) return venvPy
  console.warn('[iquestions] 创建 .venv 失败（可能缺少 python3-venv），将直接使用系统 Python 安装依赖。')
  return systemPython
}

function pyArgs(python) {
  const [cmd, ...args] = python.split(' ')
  return { cmd, args }
}

function setup() {
  log('安装前端依赖 (frontend/node_modules) …')
  if (run('npm', ['install', '--no-fund', '--no-audit'], { cwd: FRONTEND }) !== 0) fail('前端依赖安装失败')

  const sysPy = findPython()
  if (!sysPy) fail('未找到 Python 3.10+，请先安装 Python（https://www.python.org/downloads/）后重试。')
  const python = ensureVenv(sysPy)
  const { cmd, args } = pyArgs(python)
  log(`安装后端依赖 (使用 ${python}) …`)
  let status = run(cmd, [...args, '-m', 'pip', 'install', '-q', '-r', path.join(BACKEND, 'requirements-dev.txt')])
  if (status !== 0 && python === sysPy) {
    log('尝试以 --user 方式安装 …')
    status = run(cmd, [...args, '-m', 'pip', 'install', '-q', '--user', '-r', path.join(BACKEND, 'requirements-dev.txt')])
  }
  if (status !== 0) fail('后端依赖安装失败，请检查 pip 是否可用')
  log('依赖安装完成。运行 `npm run dev` 启动系统。')
}

function requirePython() {
  const python = findPython()
  if (!python) fail('未找到 Python，请先运行 `npm install`（或 `npm run setup`）。')
  const { cmd, args } = pyArgs(python)
  const ok = tryRun(cmd, [...args, '-c', 'import fastapi, uvicorn'], { cwd: BACKEND })
  if (ok === null) fail('后端依赖未安装，请先运行 `npm install`（或 `npm run setup`）。')
  return { cmd, args }
}

function prefixStream(stream, name) {
  let buf = ''
  stream.on('data', (chunk) => {
    buf += chunk.toString()
    const lines = buf.split(/\r?\n/)
    buf = lines.pop() ?? ''
    for (const line of lines) console.log(`${COLORS[name]}[${name}]${COLORS.reset} ${line}`)
  })
}

function dev() {
  const { cmd, args } = requirePython()
  if (!existsSync(path.join(FRONTEND, 'node_modules'))) fail('前端依赖未安装，请先运行 `npm install`。')

  const host = process.env.HOST ?? '127.0.0.1'
  const backend = spawn(cmd, [...args, '-m', 'uvicorn', 'app.main:app', '--reload', '--host', host, '--port', '8000'], {
    cwd: BACKEND,
    shell: IS_WIN,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
  })
  const frontend = spawn('npm', ['run', 'dev', '--silent'], { cwd: FRONTEND, shell: IS_WIN, env: { ...process.env, FORCE_COLOR: '0' } })

  for (const [p, name] of [[backend, 'backend'], [frontend, 'frontend']]) {
    prefixStream(p.stdout, name)
    prefixStream(p.stderr, name)
  }

  let shuttingDown = false
  const shutdown = (code = 0) => {
    if (shuttingDown) return
    shuttingDown = true
    for (const p of [backend, frontend]) if (!p.killed) p.kill(IS_WIN ? undefined : 'SIGTERM')
    setTimeout(() => process.exit(code), 300)
  }
  backend.on('exit', (code) => {
    if (!shuttingDown) console.log(`[backend] 已退出 (code ${code})`)
    shutdown(code ?? 0)
  })
  frontend.on('exit', (code) => {
    if (!shuttingDown) console.log(`[frontend] 已退出 (code ${code})`)
    shutdown(code ?? 0)
  })
  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  log('后端: http://127.0.0.1:8000  (API 文档 http://127.0.0.1:8000/docs)')
  log('前端: http://localhost:5173  ← 在浏览器中打开这个地址开始刷题')
  log('按 Ctrl+C 停止。')
}

function test() {
  const { cmd, args } = requirePython()
  log('运行后端单元测试 …')
  const py = run(cmd, [...args, '-m', 'pytest', '-q'], { cwd: BACKEND })
  log('前端类型检查与构建 …')
  const fe = run('npm', ['run', 'build', '--silent'], { cwd: FRONTEND })
  if (py !== 0 || fe !== 0) fail('测试未通过')
  log('全部通过。')
}

function seed() {
  const { cmd, args } = requirePython()
  process.exit(run(cmd, [...args, '-m', 'app.seed', ...process.argv.slice(3)], { cwd: BACKEND }))
}

const command = process.argv[2]
const commands = { setup, dev, test, seed }
if (!commands[command]) {
  console.log('用法: node scripts/run.mjs <setup|dev|test|seed>')
  process.exit(1)
}
commands[command]()
