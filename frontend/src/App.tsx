import { useEffect, useState } from 'react';

type User = { id: string; phone: string; phonemail: string; displayName: string; language?: string };
type Message = {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject?: string;
  content: string;
  createdAt: string;
  favorite?: boolean;
  spam?: boolean;
  trashed?: boolean;
  sender?: { displayName?: string };
};

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('phonemail_token'));
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('9876543210');
  const [password, setPassword] = useState('password123');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('Ava');
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [compose, setCompose] = useState({ to: '', subject: '', content: '' });
  const [error, setError] = useState('');

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchJson = async (input: string, init?: RequestInit) => {
    const res = await fetch(`${API}${input}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'Request failed');
    return data;
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await fetchJson('/api/auth/me', { headers: authHeaders });
        setUser(data.user);
        const inbox = await fetchJson('/api/emails/inbox', { headers: authHeaders });
        setMessages(inbox.messages ?? []);
      } catch {
        localStorage.removeItem('phonemail_token');
        setToken(null);
      }
    })();
  }, [token]);

  const attemptAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'register'
        ? { phone, otp, password, displayName }
        : { phone, otp, password };

      const data = await fetchJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      localStorage.setItem('phonemail_token', data.token);
      setToken(data.token);
      setUser(data.user);
      const inbox = await fetchJson('/api/emails/inbox', { headers: authHeaders });
      setMessages(inbox.messages ?? []);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  const handleSearch = async () => {
    if (!token) return;
    try {
      const data = await fetchJson(`/api/search?q=${encodeURIComponent(search)}`, { headers: authHeaders });
      setMessages(data.results ?? []);
    } catch {
      setError('Search unavailable');
    }
  };

  const handleCompose = async () => {
    if (!token) return;
    try {
      await fetchJson('/api/emails/compose', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ...compose, to: compose.to, content: compose.content }),
      });
      setCompose({ to: '', subject: '', content: '' });
      const inbox = await fetchJson('/api/emails/inbox', { headers: authHeaders });
      setMessages(inbox.messages ?? []);
    } catch (err: any) {
      setError(err.message || 'Compose failed');
    }
  };

  const handleFavorite = async (id: string) => {
    if (!token) return;
    await fetchJson(`/api/emails/${id}/favorite`, { method: 'POST', headers: authHeaders });
    const inbox = await fetchJson('/api/emails/inbox', { headers: authHeaders });
    setMessages(inbox.messages ?? []);
  };

  if (!token || !user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand">PhoneMail</div>
          <div className="auth-toggle">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
          </div>

          <form onSubmit={attemptAuth} className="stack">
            {mode === 'register' && (
              <label>
                Display name
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </label>
            )}

            <label>
              Phone number
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>

            <label>
              OTP or password
              <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP or password" />
            </label>

            {mode === 'login' && (
              <label>
                Password fallback
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            )}

            {mode === 'register' && (
              <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            )}

            <button type="submit" className="primary-btn">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
            <p className="small-note">By signing up, you agree to the Terms of Service.</p>
            {error && <div className="error-box">{error}</div>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar desktop-only">
        <div className="brand-row">
          <div className="brand">PhoneMail</div>
          <button className="primary-btn small">Compose</button>
        </div>

        <nav className="menu">
          <button>Inbox</button>
          <button>Drafts</button>
          <button>Spam</button>
          <button>Trash</button>
        </nav>

        <div className="profile-box">
          <div><strong>{user.displayName}</strong></div>
          <div>{user.phonemail}</div>
          <button className="ghost-btn" onClick={() => { localStorage.removeItem('phonemail_token'); setToken(null); }}>Logout</button>
        </div>
      </aside>

      <main className="content-panel">
        <header className="topbar">
          <div className="search-wrap">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" />
            <button onClick={handleSearch}>Search</button>
          </div>
          <div className="profile-pill">{user.displayName}</div>
        </header>

        <div className="filter-row">
          <button className="chip active">All</button>
          <button className="chip">Unread</button>
          <button className="chip">Attachments</button>
          <button className="chip">Favorites</button>
        </div>

        <div className="panel-grid">
          <section className="mail-list">
            {messages.length === 0 ? (
              <div className="empty-state">No conversations found.</div>
            ) : (
              messages.map((message) => (
                <article key={message.id} className="email-item">
                  <div className="email-meta">
                    <strong>{message.sender?.displayName ?? message.senderEmail}</strong>
                    <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="subject-row">
                    <span>{message.subject ?? 'No subject'}</span>
                    <button className="favorite" onClick={() => handleFavorite(message.id)}>{message.favorite ? '★' : '☆'}</button>
                  </div>
                  <p>{message.content}</p>
                </article>
              ))
            )}
          </section>

          <section className="composer card">
            <h3>Compose</h3>
            <div className="stack add-padding">
              <label>
                To
                <input value={compose.to} onChange={(e) => setCompose((prev) => ({ ...prev, to: e.target.value }))} />
              </label>
              <label>
                Subject
                <input value={compose.subject} onChange={(e) => setCompose((prev) => ({ ...prev, subject: e.target.value }))} />
              </label>
              <label>
                Message
                <textarea value={compose.content} onChange={(e) => setCompose((prev) => ({ ...prev, content: e.target.value }))} rows={6} />
              </label>
              <button className="primary-btn" onClick={handleCompose}>Send</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
