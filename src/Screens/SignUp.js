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
    <div className="login-wrapper">
      <button className="floating-back-btn" onClick={() => navigate('/')}>← Home</button>
      <div className="login-card">
        <div className="login-title">Sign Up for <span className="brand">JeepRoute</span></div>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="login-btn" type="submit">Sign Up</button>
        </form>
        {error && <div className="error" style={{ color: '#f55', marginTop: 10 }}>{error}</div>}
        <div className="login-footer">
          Already have an account?{' '}
          <span className="signup-link" onClick={() => navigate('/signin', { state: { redirectTo } })}>Sign In</span>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
