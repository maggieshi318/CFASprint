import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startCheckout } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'

type UpgradeButtonProps = {
  className?: string
  children?: string
  source?: string
}

export default function UpgradeButton({
  className = 'primary-btn',
  children = 'Unlock Full Access - AED 99',
  source = '/pricing',
}: UpgradeButtonProps) {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    if (user?.isPremium) return
    if (!token) {
      navigate('/register', { state: { from: source } })
      return
    }

    setLoading(true)
    try {
      const result = await startCheckout(token, 'paid_lifetime')
      if (result.url) {
        window.location.assign(result.url)
        return
      }
      window.alert(result.message || 'Payment is not configured yet.')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not open payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" className={className} disabled={loading || user?.isPremium} onClick={handleUpgrade}>
      {user?.isPremium ? 'Full Access Active' : loading ? 'Opening payment...' : children}
    </button>
  )
}
