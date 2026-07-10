import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const emptyForm = {
  title: '',
  amount: '',
  type: 'expense',
  category: '',
  date: new Date().toISOString().slice(0, 10)
}

function App() {
  const [health, setHealth] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [route, setRoute] = useState(() => window.location.pathname)

  const navigateTo = (path) => {
    window.history.pushState({}, '', path)
    setRoute(path)
  }

  const loadTransactions = async () => {
    try {
      const [healthRes, txRes] = await Promise.all([
        fetch(`${API_URL}/health`),
        fetch(`${API_URL}/transactions`)
      ])

      const healthData = await healthRes.json()
      const txData = await txRes.json()
      setHealth(healthData)
      setTransactions(txData)
    } catch (err) {
      console.error(err)
      setError('Unable to reach the backend right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', syncRoute)
    loadTransactions()

    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!form.title || !form.amount || !form.category) {
      setError('Please fill in the title, amount, and category.')
      return
    }

    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `${API_URL}/transactions/${editingId}` : `${API_URL}/transactions`
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) })
      })

      if (!response.ok) {
        throw new Error('Could not save transaction.')
      }

      setForm(emptyForm)
      setEditingId(null)
      setMessage(editingId ? 'Transaction updated.' : 'Transaction added.')
      await loadTransactions()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (transaction) => {
    setEditingId(transaction._id)
    setForm({
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)
    })
  }

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Could not delete transaction.')
      }
      setMessage('Transaction removed.')
      await loadTransactions()
    } catch (err) {
      setError(err.message)
    }
  }

  const totals = transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === 'income') {
        acc.income += Number(transaction.amount)
      } else {
        acc.expense += Number(transaction.amount)
      }
      return acc
    },
    { income: 0, expense: 0 }
  )
  const balance = totals.income - totals.expense

  if (route === '/health') {
    return (
      <div className="app health-page">
        <div className="hero-panel health-hero">
          <div className="hero-copy">
            <p className="eyebrow">System status</p>
            <h1>Backend health overview</h1>
            <p className="subtle">The finance API is responding at the requested endpoint.</p>
          </div>
          <button type="button" className="ghost-button" onClick={() => navigateTo('/')}>
            Open dashboard
          </button>
        </div>

        <main className="app-main health-main">
          <section className="card health-card">
            <div className="status-row">
              <span className={`status-badge ${health?.status === 'ok' ? 'ok' : 'warn'}`}>
                {health?.status || 'checking'}
              </span>
              <p className="muted">Live backend check</p>
            </div>
            {loading ? (
              <p className="health-loading">Checking service availability…</p>
            ) : health ? (
              <div className="health-grid">
                <div>
                  <p className="label">Status</p>
                  <strong>{health.status}</strong>
                </div>
                <div>
                  <p className="label">Service</p>
                  <strong>{health.service}</strong>
                </div>
                <div>
                  <p className="label">Uptime</p>
                  <strong>{Math.round(health.uptime || 0)}s</strong>
                </div>
                <div>
                  <p className="label">Timestamp</p>
                  <strong>{health.timestamp}</strong>
                </div>
              </div>
            ) : (
              <p className="health-error">Unable to reach the backend right now.</p>
            )}
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">Finance workspace</p>
            <h1>Control your cash flow with clarity</h1>
            <p className="subtle">A polished finance tracker built for daily planning, smart oversight, and calm decision-making.</p>
          </div>
          <div className="hero-actions">
            <button type="button" className="ghost-button" onClick={() => navigateTo('/health')}>
              View backend health
            </button>
          </div>
        </div>
      </header>

      <main className="app-main dashboard-grid">

        <section className="card summary-grid">
          <div className="summary-box income">
            <span>Income</span>
            <strong>${totals.income.toFixed(2)}</strong>
          </div>
          <div className="summary-box expense">
            <span>Expenses</span>
            <strong>${totals.expense.toFixed(2)}</strong>
          </div>
          <div className="summary-box balance">
            <span>Balance</span>
            <strong>${balance.toFixed(2)}</strong>
          </div>
        </section>

        <section className="card form-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Capture</p>
              <h2>{editingId ? 'Edit transaction' : 'Add a transaction'}</h2>
            </div>
          </div>
          <form className="transaction-form" onSubmit={handleSubmit}>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Title"
            />
            <input
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              placeholder="Amount"
              min="0"
            />
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              placeholder="Category"
            />
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
            <button type="submit">{editingId ? 'Update' : 'Add'}</button>
          </form>
          {error && <p className="feedback error">{error}</p>}
          {message && <p className="feedback success">{message}</p>}
        </section>

        <section className="card transactions-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Activity</p>
              <h2>Recent transactions</h2>
            </div>
          </div>
          {transactions.length === 0 ? (
            <p className="muted">No transactions yet. Add your first one to get started.</p>
          ) : (
            <ul className="transaction-list">
              {transactions.map((transaction) => (
                <li key={transaction._id} className="transaction-item">
                  <div>
                    <strong>{transaction.title}</strong>
                    <p>{transaction.category} • {transaction.date}</p>
                  </div>
                  <div className="transaction-meta">
                    <span className={transaction.type === 'income' ? 'pill income' : 'pill expense'}>
                      {transaction.type === 'income' ? '+' : '-'}${Number(transaction.amount).toFixed(2)}
                    </span>
                    <div className="actions">
                      <button type="button" onClick={() => handleEdit(transaction)}>Edit</button>
                      <button type="button" className="danger" onClick={() => handleDelete(transaction._id)}>Delete</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <p>Built with React, Express, MongoDB, Docker, and Kubernetes</p>
      </footer>
    </div>
  )
}

export default App
