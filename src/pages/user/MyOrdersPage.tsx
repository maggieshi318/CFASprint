import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrders, type OrderItem } from '../../api/mockApi'
import { useAuth } from '../../auth/AuthContext'
import { userCenterCopy } from '../../i18n/copy'

export default function MyOrdersPage() {
  const { token } = useAuth()
  const t = userCenterCopy
  const [orders, setOrders] = useState<OrderItem[]>([])

  useEffect(() => {
    if (!token) return
    fetchOrders(token).then(setOrders)
  }, [token])

  return (
    <section className="panel user-panel lr-panel">
      <h2>{t.pages.ordersTitle}</h2>
      <p className="helper-text">{t.pages.ordersHint}</p>

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>{t.pages.noOrders}</p>
          <Link to="/pricing">{t.pages.browsePlans}</Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.pages.orderId}</th>
                <th>{t.pages.orderPlan}</th>
                <th>{t.pages.orderAmount}</th>
                <th>{t.pages.orderDate}</th>
                <th>{t.pages.orderStatus}</th>
                <th>{t.pages.orderExpires}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.planName}</td>
                  <td>{order.amount}</td>
                  <td>{order.createdAt?.slice(0, 10)}</td>
                  <td>{order.status}</td>
                  <td>{order.expiresAt ? order.expiresAt.slice(0, 10) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="helper-text" style={{ marginTop: '1rem' }}>
        <Link to="/pricing">{t.pages.browsePlans}</Link>
      </p>
    </section>
  )
}
