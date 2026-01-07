import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "../components/sidebar";
import { isAuthenticated } from "../lib/auth";
import * as styles from "../styles/layout.css";

export default function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check for user info if authenticated
    if (isAuthenticated()) {
      // Could fetch user info here
      setUserEmail("user@example.com");
    }
  }, []);

  return (
    <div className={styles.container}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userEmail={userEmail}
      />
      <main
        className={`${styles.main} ${sidebarOpen ? styles.mainExpanded : ""}`}
      >
        <Outlet />
      </main>
    </div>
  );
}
