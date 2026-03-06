import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';

function SignUp({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    /* MOCK MODE: enable for offline testing
    const existingUser = usersData.find(u => u.email === email);
    if (existingUser) {
      setError('Email already exists');
      return;
    }
    const newUser = {
      id: usersData.length + 1,
      email,
      username: email.split('@')[0],
      is_premium: false
    };
    onAuth({ user: newUser, token: 'mock-token-' + newUser.id });
    navigate(redirectTo);
    return;
    */

    try {
      const res = await fetch(`${API_BASE_URL}/api/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        // Store JWT tokens in localStorage
        if (data.token) localStorage.setItem('accessToken', data.token);
        if (data.refresh) localStorage.setItem('refreshToken', data.refresh);
        // Persist currentUser in localStorage for authFetch
        const userObj = { ...data.user, token: data.token, refresh: data.refresh };
        localStorage.setItem('currentUser', JSON.stringify(userObj));
        onAuth(userObj);
        navigate('/');
      } else {
        setError(data.message || 'Sign up failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="auth-back-btn" onClick={() => navigate('/')}>← Home</button>
        <div className="auth-badge"><svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-geo-alt" viewBox="0 0 16 16"><path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10"/><path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/></svg></div>
        <div className="auth-title">Create Account</div>
        <p className="auth-subtitle">Join JeepRoute today</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-form-group">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="********"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="auth-submit-btn" type="submit">Create Account</button>
        </form>
        {error && <div className="auth-error-msg" style={{ color: '#cf2d2d', marginTop: 10 }}>{error}</div>}
        <div className="auth-footer">
          Already have an account?{' '}
          <span className="auth-link" onClick={() => navigate('/signin', { state: { redirectTo } })}>Sign In</span>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
