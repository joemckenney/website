import * as styles from "./login-button.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function LoginButton() {
  const handleLogin = () => {
    // Redirect to Google OAuth flow on the API server
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <button type="button" className={styles.loginButton} onClick={handleLogin}>
      Login with Google
    </button>
  );
}
