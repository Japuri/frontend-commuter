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
    <div className="login-card">
      <h2 className="login-title">Welcome</h2>
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

      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

export default LoginScreen;
