import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authenticateUser } from "./db";

function LoginScreen({ setCurrentUser }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");

    const user = authenticateUser(username, password);

    if (user) {
      setCurrentUser(user);

      localStorage.setItem("currentUser", JSON.stringify(user));

      setUsername("");
      setPassword("");

      navigate("/");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="auth-page">
      <button className="auth-back-btn" onClick={() => navigate("/")}>
        ← Home
      </button>
      <div className="auth-card">
        <div className="auth-badge"><svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-geo-alt" viewBox="0 0 16 16"><path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.07A32 32 0 0 1 8 14.58a32 32 0 0 1-2.206-2.57c-.726-.95-1.436-2.008-1.96-3.07C3.304 7.867 3 6.862 3 6a5 5 0 0 1 10 0c0 .862-.305 1.867-.834 2.94M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10"/><path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4m0 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/></svg></div>
        <h2 className="auth-title">
          Welcome back to <span className="auth-brand">JeepRoute</span>
        </h2>
        <p className="auth-subtitle">Sign in to continue your commute planning.</p>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-label">Username</label>
            <input
              type="text"
              placeholder="juan dela cruz"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label">Password</label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
            />
          </div>

          <button type="submit" className="auth-submit-btn">
            Sign In
          </button>
        </form>

        {error && (
          <p className="auth-error-msg" style={{ color: "#cf2d2d", marginTop: 10 }}>
            {error}
          </p>
        )}

        <div className="auth-footer">
          Don't have an account?{" "}
          <span className="auth-link" onClick={() => navigate("/signup")}>
            Sign Up
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
