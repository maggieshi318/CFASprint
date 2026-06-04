import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <section className="panel legal-page">
      <h2>Terms of Service</h2>
      <p className="meta">Last updated: May 2026 · CFA Sprint</p>

      <h3>1. Service</h3>
      <p>
        CFA Sprint provides educational practice tools for CFA Level I candidates. We do not guarantee exam results
        or affiliation with CFA Institute beyond descriptive references to the exam curriculum.
      </p>

      <h3>2. Accounts</h3>
      <p>You are responsible for safeguarding your login credentials and activity under your account.</p>

      <h3>3. Subscriptions</h3>
      <p>
        Paid plans renew according to the billing terms shown at checkout (Stripe). You may cancel according to the
        instructions in your receipt or account portal.
      </p>

      <h3>4. Acceptable use</h3>
      <p>
        Do not scrape, redistribute, or resell question content. Do not attempt to disrupt the service or access
        other users&apos; data.
      </p>

      <h3>5. Content</h3>
      <p>
        Question explanations are for learning purposes. CFA Institute trademarks belong to their respective owners.
      </p>

      <h3>6. Disclaimer</h3>
      <p>The service is provided &quot;as is&quot; without warranties of any kind to the extent permitted by law.</p>

      <h3>7. Contact</h3>
      <p>
        Support: <a href="mailto:support@cfasprint.app">support@cfasprint.app</a>
      </p>

      <p className="helper-text">
        <Link to="/privacy">Privacy Policy</Link> · <Link to="/login">Sign in</Link>
      </p>
    </section>
  )
}
