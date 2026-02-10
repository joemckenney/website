import { useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * Redirect /tables to /bases
 * Tables are now accessed via bases, not standalone.
 */
export default function TablesListPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/bases", { replace: true });
  }, [navigate]);

  return null;
}
