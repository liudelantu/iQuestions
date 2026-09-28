export type QuestionType = 'single' | 'multiple' | 'true_false' | 'fill_blank'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type PracticeMode = 'sequential' | 'random' | 'wrong_book' | 'favorites'

export const TYPE_LABELS: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  true_false: '判断题',
  fill_blank: '填空题',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

export const MODE_LABELS: Record<PracticeMode, string> = {
  sequential: '顺序练习',
  random: '随机练习',
  wrong_book: '错题重练',
  favorites: '收藏练习',
}

export interface OptionOut {
  id: number
  label: string
  content: string
  is_correct: boolean
}

export interface PracticeOption {
  id: number
  label: string
  content: string
}

export interface Question {
  id: number
  source_id: string | null
  type: QuestionType
  type_label: string
  title: string
  content: string | null
  explanation: string | null
  difficulty: Difficulty
  difficulty_label: string
  category: string
  tags: string[]
  options: OptionOut[]
  fill_answers: string[][] | null
  is_favorite: boolean
  attempt_count: number
  wrong_count: number
  created_at: string
  updated_at: string
}

export interface PracticeQuestion {
  id: number
  type: QuestionType
  type_label: string
  title: string
  content: string | null
  difficulty: Difficulty
  difficulty_label: string
  category: string
  tags: string[]
  options: PracticeOption[]
  blank_count: number
  is_favorite: boolean
}

export interface QuestionInput {
  type: QuestionType
  title: string
  content?: string | null
  options: { content: string; is_correct: boolean }[]
  fill_answers?: string[][] | null
  explanation?: string | null
  difficulty: Difficulty
  category: string
  tags: string[]
  source_id?: string | null
}

export interface QuestionPage {
  items: Question[]
  total: number
  page: number
  page_size: number
}

export interface QuestionFilters {
  type?: QuestionType | ''
  category?: string
  tag?: string
  difficulty?: Difficulty | ''
  keyword?: string
  favorite?: boolean
}

export interface ImportResult {
  imported: number
  failed: { index: number; error: string }[]
  ids: number[]
}

export type UserAnswer = number[] | string[]

export interface AnswerResult {
  question_id: number
  is_correct: boolean
  user_answer: UserAnswer
  correct_option_ids: number[]
  correct_answers: string[][] | null
  explanation: string | null
  in_wrong_book: boolean
  attempt_id: number
}

export interface WrongBookItem {
  question: Question
  wrong_count: number
  first_wrong_at: string
  last_wrong_at: string
}

export interface CategoryStat {
  category: string
  question_count: number
  attempts: number
  correct: number
  accuracy: number
}

export interface DayStat {
  date: string
  attempts: number
  correct: number
  accuracy: number
}

export interface StatsOverview {
  total_questions: number
  total_attempts: number
  correct_attempts: number
  accuracy: number
  answered_questions: number
  wrong_book_count: number
  favorite_count: number
  by_category: CategoryStat[]
  last_7_days: DayStat[]
}

export interface Meta {
  categories: { name: string; count: number }[]
  tags: { name: string; count: number }[]
  types: { value: QuestionType; label: string; count: number }[]
  difficulties: { value: Difficulty; label: string; count: number }[]
  total_questions: number
}
