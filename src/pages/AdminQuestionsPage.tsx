import { useEffect, useState } from 'react'
import { deleteQuestion, downloadAdminCsv, fetchQuestions, importQuestionsCsv, upsertQuestion } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import type { Answer, Question } from '../types'

type FormState = Omit<Question, 'id'> & { id?: number }

const defaultForm: FormState = {
  topic: '',
  los: '',
  examYear: 2026,
  tags: [],
  difficulty: 'Medium',
  stem: '',
  options: { A: '', B: '', C: '' },
  answer: 'A',
  explanation: '',
}

export default function AdminQuestionsPage() {
  const { token, locale } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [form, setForm] = useState<FormState>(defaultForm)
  const [tagInput, setTagInput] = useState('')
  const [csvText, setCsvText] = useState(
    'topic,los,exam_year,tags,difficulty,stem,option_a,option_b,option_c,answer,explanation\n',
  )
  const [csvErrors, setCsvErrors] = useState<Array<{ line: number; reason: string }>>([])

  useEffect(() => {
    if (!token) return
    fetchQuestions(token).then(setQuestions)
  }, [token])

  async function handleSave() {
    if (!token) return
    const updated = await upsertQuestion(token, form)
    setQuestions(updated)
    setForm(defaultForm)
    setTagInput('')
  }

  async function handleDelete(id: number) {
    if (!token) return
    const updated = await deleteQuestion(token, id)
    setQuestions(updated)
    if (form.id === id) {
      setForm(defaultForm)
      setTagInput('')
    }
  }

  async function handleImportCsv() {
    if (!token) return
    const result = await importQuestionsCsv(token, csvText)
    setQuestions(result.questions)
    setCsvErrors(result.errors || [])
  }

  function loadQuestion(item: Question) {
    setForm(item)
    setTagInput(item.tags.join(', '))
  }

  function setOption(key: Answer, value: string) {
    setForm((prev) => ({ ...prev, options: { ...prev.options, [key]: value } }))
  }

  return (
    <section className="panel">
      <h2>{locale === 'zh' ? '运营后台 - 题库管理' : 'Admin - Question Bank'}</h2>
      <p className="meta">
        {locale === 'zh'
          ? '支持题目创建、更新、删除、CSV 批量导入。'
          : 'Create, update, delete, and import questions with metadata.'}
      </p>
      <div className="review-grid">
        <article>
          <h3>
            {form.id
              ? locale === 'zh'
                ? `编辑题目 #${form.id}`
                : `Edit Question #${form.id}`
              : locale === 'zh'
                ? '创建题目'
                : 'Create Question'}
          </h3>
          <div className="form-grid">
            <label>
              {locale === 'zh' ? '科目' : 'Topic'}
              <input
                value={form.topic}
                onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
              />
            </label>
            <label>
              LOS
              <input
                value={form.los}
                onChange={(e) => setForm((prev) => ({ ...prev, los: e.target.value }))}
              />
            </label>
            <label>
              {locale === 'zh' ? '考试年份' : 'Exam Year'}
              <input
                type="number"
                value={form.examYear}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, examYear: Number(e.target.value) || 2026 }))
                }
              />
            </label>
            <label>
              {locale === 'zh' ? '难度' : 'Difficulty'}
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    difficulty: e.target.value as Question['difficulty'],
                  }))
                }
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </label>
            <label className="full">
              {locale === 'zh' ? '标签（逗号分隔）' : 'Tags (comma separated)'}
              <input
                value={tagInput}
                onChange={(e) => {
                  const value = e.target.value
                  setTagInput(value)
                  setForm((prev) => ({
                    ...prev,
                    tags: value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  }))
                }}
              />
            </label>
            <label className="full">
              {locale === 'zh' ? '题干' : 'Stem'}
              <textarea
                value={form.stem}
                onChange={(e) => setForm((prev) => ({ ...prev, stem: e.target.value }))}
              />
            </label>
            <label className="full">
              {locale === 'zh' ? '选项 A' : 'Option A'}
              <input value={form.options.A} onChange={(e) => setOption('A', e.target.value)} />
            </label>
            <label className="full">
              {locale === 'zh' ? '选项 B' : 'Option B'}
              <input value={form.options.B} onChange={(e) => setOption('B', e.target.value)} />
            </label>
            <label className="full">
              {locale === 'zh' ? '选项 C' : 'Option C'}
              <input value={form.options.C} onChange={(e) => setOption('C', e.target.value)} />
            </label>
            <label>
              {locale === 'zh' ? '正确答案' : 'Correct Answer'}
              <select
                value={form.answer}
                onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value as Answer }))}
              >
                <option>A</option>
                <option>B</option>
                <option>C</option>
              </select>
            </label>
            <label className="full">
              {locale === 'zh' ? '解析' : 'Explanation'}
              <textarea
                value={form.explanation}
                onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))}
              />
            </label>
          </div>
          <div className="actions">
            <button onClick={handleSave}>
              {form.id
                ? locale === 'zh'
                  ? '更新题目'
                  : 'Update Question'
                : locale === 'zh'
                  ? '创建题目'
                  : 'Create Question'}
            </button>
            <button
              onClick={() => {
                setForm(defaultForm)
                setTagInput('')
              }}
            >
              {locale === 'zh' ? '重置' : 'Reset'}
            </button>
          </div>
          <hr />
          <h3>{locale === 'zh' ? 'CSV 批量导入' : 'CSV Bulk Import'}</h3>
          <p className="helper-text">
            {locale === 'zh'
              ? '列名：topic, los, exam_year, tags(用|分隔), difficulty, stem, option_a, option_b, option_c, answer, explanation'
              : 'Columns: topic, los, exam_year, tags (pipe-separated), difficulty, stem, option_a, option_b, option_c, answer, explanation'}
            {' · '}
            {locale === 'zh' ? '示例文件：' : 'Sample file: '}
            <code>data/sample-commercial-bank.csv</code>
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            style={{ width: '100%', minHeight: 120 }}
          />
          <div className="actions">
            <button type="button" onClick={() => token && downloadAdminCsv(token, 'csv-template')}>
              {locale === 'zh' ? '下载模板' : 'Download template'}
            </button>
            <button type="button" onClick={() => token && downloadAdminCsv(token, 'export-csv')}>
              {locale === 'zh' ? '导出题库' : 'Export bank'}
            </button>
            <button type="button" onClick={handleImportCsv}>
              {locale === 'zh' ? '导入 CSV' : 'Import CSV'}
            </button>
          </div>
          {csvErrors.length > 0 && (
            <div className="result bad">
              <strong>{locale === 'zh' ? '导入错误行：' : 'CSV import errors:'}</strong>
              <ul>
                {csvErrors.map((err) => (
                  <li key={`${err.line}-${err.reason}`}>
                    {locale === 'zh'
                      ? `第 ${err.line} 行：${err.reason}`
                      : `Line ${err.line}: ${err.reason}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
        <article>
          <h3>{locale === 'zh' ? '现有题目' : 'Existing Questions'}</h3>
          <div className="topic-list">
            {questions.map((q) => (
              <div key={q.id} className="topic-row">
                <button className="left plain-btn" onClick={() => loadQuestion(q)}>
                  <div>
                    <strong>
                      #{q.id} {q.topic} ({q.los})
                    </strong>
                    <p>
                      {q.examYear} · {q.difficulty} · {q.tags.join(', ')}
                    </p>
                  </div>
                </button>
                <button className="danger-btn" onClick={() => handleDelete(q.id)}>
                  {locale === 'zh' ? '删除' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
