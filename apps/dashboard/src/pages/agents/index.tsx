import * as styles from "../../styles/tables.css";

export default function AgentsPage() {
  return (
    <>
      <header className={styles.header}>
        <span className={styles.title}>Agents</span>
      </header>
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>Agents coming soon.</p>
        </div>
      </div>
    </>
  );
}
