import * as styles from "./login-button.css";

export function LoginButton() {
  const handleLogin = () => {
    // Redirect to Google OAuth flow on the API server
    window.location.href = "http://localhost:3000/auth/google";
  };

  return (
    <button className={styles.loginButton} onClick={handleLogin}>
      Login with Google
    </button>
  );
}
