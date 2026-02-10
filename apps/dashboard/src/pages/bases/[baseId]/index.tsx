import { tablesService } from "@tables/sdk";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ensureValidToken } from "../../../lib/auth";
import * as layoutStyles from "../../../styles/layout.css";
import * as styles from "../../../styles/tables.css";

export default function BaseRedirectPage() {
  const { baseId } = useParams<{ baseId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baseId) return;

    const redirect = async () => {
      const token = await ensureValidToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      try {
        const response = await tablesService.getBase({
          path: { baseId },
        });

        if (response.error || !response.data) {
          setError("Failed to load base");
          return;
        }

        if (response.data.tables.length > 0) {
          navigate(`/bases/${baseId}/${response.data.tables[0].id}`, {
            replace: true,
          });
        } else {
          // No tables yet — redirect to a sentinel so the main page can handle it
          navigate(`/bases/${baseId}/_empty`, { replace: true });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load base");
      }
    };

    redirect();
  }, [baseId, navigate]);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return <div className={layoutStyles.loadingContainer}>Loading...</div>;
}
