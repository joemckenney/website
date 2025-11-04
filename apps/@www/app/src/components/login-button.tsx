import * as styles from "./login-button.css";

export function LoginButton() {
  const handleLogin = () => {
    window.location.href = "https://app.joemckenney.com";
  };

  return (
    <button className={styles.loginButton} onClick={handleLogin}>
      Login
    </button>
  );
}
