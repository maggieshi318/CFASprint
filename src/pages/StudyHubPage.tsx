import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { copyFor } from '../i18n/copy'

const modules = [
  {
    key: 'statistics',
    to: '/study/statistics',
    titleEn: 'Statistics',
    titleZh: '统计',
    descEn: 'Accuracy, topic progress, weak areas, and mock trends.',
    descZh: '正确率、科目进度、薄弱项与模考趋势。',
  },
  {
    key: 'questionBank',
    to: '/study/practice',
    titleEn: 'Question Bank',
    titleZh: '题库',
    descEn: 'Practice CFA Level I questions by topic, LOS, and difficulty.',
    descZh: '按科目、LOS 和难度刷题练习。',
  },
  {
    key: 'mock',
    to: '/study/mock-exam',
    titleEn: 'Mock Exam',
    titleZh: '模考',
    descEn: 'Timed mock sessions with score reports.',
    descZh: '计时模考与成绩报告。',
  },
  {
    key: 'review',
    to: '/study/review',
    titleEn: 'Review',
    titleZh: '复习',
    descEn: 'Wrong-book recovery and favorite questions.',
    descZh: '错题本与收藏题复习。',
  },
  {
    key: 'sprint',
    to: '/study/sprint-plan',
    titleEn: 'Sprint Plan',
    titleZh: '冲刺计划',
    descEn: '8-week roadmap and weekly goals.',
    descZh: '8 周路线图与每周目标。',
  },
] as const

export default function StudyHubPage() {
  const { locale } = useAuth()
  const t = copyFor(locale)
  const zh = locale === 'zh'

  return (
    <section className="panel study-hub">
      <h2>{zh ? '学习模块' : 'Study Modules'}</h2>
      <p className="helper-text">
        {zh
          ? '选择统计或题库开始学习，也可进入模考、复习与冲刺计划。'
          : 'Choose Statistics or Question Bank to start, or open mock exams, review, and sprint plan.'}
      </p>

      <div className="study-hub-grid">
        {modules.map((item) => (
          <Link key={item.key} to={item.to} className={`study-hub-card ${item.key === 'statistics' || item.key === 'questionBank' ? 'featured' : ''}`}>
            <h3>{zh ? item.titleZh : item.titleEn}</h3>
            <p>{zh ? item.descZh : item.descEn}</p>
            <span className="study-hub-cta">{zh ? '进入' : 'Open'}</span>
          </Link>
        ))}
      </div>

      <p className="helper-text">
        <Link to="/user/courses">← {t.layout.backToCourses}</Link>
      </p>
    </section>
  )
}
