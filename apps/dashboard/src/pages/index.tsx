import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Token extraction is handled in main.tsx before React renders.
    // This page just redirects to the default route.
    navigate("/bases", { replace: true });
  }, [navigate]);

  return null;
}
