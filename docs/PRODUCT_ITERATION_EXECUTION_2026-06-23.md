# CFA Sprint 产品迭代执行记录

日期：2026-06-23

## 本次完成

1. My Notes 后端持久化
   - 新增 `practice_notes` 表。
   - 新增后端 notes API：列表、单题读取、保存/更新、删除、旧本地笔记迁移。
   - `PracticePage` 保存笔记时优先写后端，成功后保留本地兼容缓存。
   - `MyNotesPage` 和 study 侧栏从后端 notes 列表读取，并在首次加载时迁移旧 localStorage 笔记。

2. Founder funnel / activation tracking
   - 新增 `founder_funnel` 表，追踪 `exam_window`、`daily_checkin_willing`、`free_trial_feedback_willing`、`activation_started`、`practice_completed`、`ai_tutor_used`、`ai_study_report_generated`、`value_signal`、`founder_offer_sent`、`paid_user`。
   - Founder 私域 offer 支持记录 `founder_offer_price`、`founder_offer_currency`、`founder_offer_accepted`、拒绝原因和价格/权益反馈。
   - Onboarding 增加 Aug/Nov 2026 exam window、daily check-in、free trial feedback 三项确认。
   - 提交练习题后自动记录 `practice_completed`。
   - 后台 analytics 增加 Founder qualified、AI Tutor used、AI reports、Value signal、paid_user 指标和候选人明细。
   - 后台候选人表提供内部操作：Mark offer、Accepted、Rejected、Mark paid_user。该操作只记录 funnel 状态，不触发支付。

3. AI value moment
   - AI Tutor 调用成功后记录 `ai_tutor_used`，并自动形成 `value_signal`。
   - AI Study Report 生成成功后写入 `ai_study_reports`，记录 `ai_study_report_generated`，并自动形成 `value_signal`。

4. 内容合规边界
   - 在 My Notes / AI Study Report 区域加入 CFA Institute 商标与题库来源需合规确认的提示。
   - 在 AI Tutor 原创替代练习区域加入提示：AI Tutor 用于解释知识点和生成原创练习，不鼓励分享真实 CFA 考试题。

## Founder plan 草案

未上线真实收费，未改动现有 AED 9.9 / AED 99 / AED 299 定价体系。

老板已确认：
- USD 49 / AED 179 只作为 Founder Program 内测私域 offer，不是官方长期公开价。
- 限前 30 名合格种子用户。
- 合格条件：Aug/Nov 2026 CFA Level I、愿意 WhatsApp 每日打卡、愿意试用并反馈。
- 官网现有 AED 9.9 trial / AED 99 / AED 299 暂时保持。
- Founder offer 用于验证付费意愿、AI Tutor + AI Study Report 价值、WhatsApp 打卡转化。

Founder 权益：
- CFA Sprint 使用权覆盖到对应考试窗口。
- 题库练习、错题集、收藏题、mock-style practice。
- AI Tutor 错题解释、知识点拆解、原创替代练习。
- AI Study Report 基于 My Notes 和练习弱点生成复习报告。
- WhatsApp Founder Study Group：每日打卡、mini quiz、学习提醒。
- Founder 反馈优先进入产品迭代。

明确不包含：
- 一对一人工辅导。
- 保证通过。
- 真实 CFA 考题或付费题库原题传播。
- 无限人工答疑。

建议最小实现：
- 先保持公开 Pricing 不变。
- 私域 offer 先由后台记录 USD 49 或 AED 179。
- 用户口头/私域接受后标记 `founder_offer_accepted`。
- 实际收款确认后再标记 `paid_user`。
- 后续如接支付，也先做配置关闭的 `founder_lifetime` plan，不默认展示。

## 每日 Founder offer 复盘

每天复盘以下指标：
- offer sent / value signal。
- offer accepted / offer sent。
- paid_user / offer accepted。
- rejected / offer sent。
- 拒绝原因：价格、权益不清楚、缺少 WhatsApp 信任、暂时不备考、需要人工辅导、其他。
- 价格反馈：USD 49 是否过高/过低，AED 179 是否更容易理解。
- 权益反馈：AI Tutor、AI Study Report、WhatsApp 打卡哪一项最能推动付费。

日复盘建议输出：
- 是否继续 USD 49 / AED 179。
- 是否调整 Founder 权益文案。
- 是否需要延后或提前发 offer。
- 哪类用户可以计入前 30 名合格种子用户。

## 验证

- `node --test server/practiceNotes.test.mjs server/founderFunnel.test.mjs`
- `npm run test:ai`
- `node --test src/pages/PracticePage.notes.test.mjs src/pages/MyNotesPage.print.test.mjs server/demoUserSeed.test.mjs`
- `npm run build`

以上命令均已通过。

## 剩余风险

- 本次没有实现复杂多端冲突合并；旧 localStorage 笔记只做首次迁移和本地兼容缓存。
- AI Study Report 已入库，但还没有历史报告列表页。
- `paid_user` 目前是内部 funnel 状态，不等同于 Stripe 支付成功；真实收费前必须确认价格、支付渠道和权益。
- 题库来源、CFA Institute 商标使用、AI 输出边界仍需要合规确认。
