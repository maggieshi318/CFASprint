import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <section className="panel legal-page">
      <h2>Privacy Policy</h2>
      <p className="meta">Last updated: May 2026 · CFA Sprint</p>

      <h3>Overview</h3>
      <p>
        CFA Sprint (&quot;we&quot;, &quot;our&quot;) provides CFA Level I exam preparation tools. This policy explains
        what data we collect and how we use it when you use our web and mobile apps.
      </p>

      <h3>Data we collect</h3>
      <ul>
        <li>Account information: name, email, password (stored hashed), language preference</li>
        <li>Study data: question submissions, favorites, mock exam sessions, progress statistics</li>
        <li>Billing data: subscription plan status; payment processing is handled by Stripe</li>
        <li>Technical data: basic server logs (IP, user agent) for security and reliability</li>
      </ul>

      <h3>How we use data</h3>
      <ul>
        <li>Provide practice, review, mock exams, and progress analytics</li>
        <li>Process subscriptions and send account-related emails (verification, password reset)</li>
        <li>Improve product quality and prevent abuse</li>
      </ul>

      <h3>Notifications</h3>
      <p>
        If you enable study reminders on mobile, notifications are scheduled locally on your device. We do not
        receive the content of those reminders.
      </p>

      <h3>Third parties</h3>
      <ul>
        <li>Stripe — payment processing</li>
        <li>Email provider (SMTP) — transactional emails</li>
      </ul>

      <h3>Retention & deletion</h3>
      <p>
        We retain account and study data while your account is active. Contact support to request account deletion.
      </p>

      <h3>Contact</h3>
      <p>
        Privacy questions: <a href="mailto:privacy@cfasprint.app">privacy@cfasprint.app</a>
      </p>

      <p className="helper-text">
        <Link to="/login">Back to sign in</Link>
      </p>
    </section>
  )
}
