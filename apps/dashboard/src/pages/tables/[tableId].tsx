import { useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * Redirect /tables/:tableId to /bases
 * Tables are now accessed via bases, not standalone.
 */
export default function TableViewPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to bases - tables are now accessed via base detail view
    navigate("/bases", { replace: true });
  }, [navigate]);

  return null;
}
