import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authenticateUser } from "./mock_db";

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
    <div className="login-wrapper">
      <button className="floating-back-btn" onClick={() => navigate("/")}>
        ← Home
      </button>
      <div className="login-card">
        <h2 className="login-title">
          Welcome to <span className="brand">JeepRoute</span>
        </h2>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />
          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        {error && (
          <p className="error-msg" style={{ color: "#f55", marginTop: 10 }}>
            {error}
          </p>
        )}

        <div className="login-footer">
          Don't have an account?{" "}
          <span className="signup-link" onClick={() => navigate("/signup")}>
            Sign Up
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
