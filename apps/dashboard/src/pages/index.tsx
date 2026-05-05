import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/chat", { replace: true });
  }, [navigate]);

  return null;
}
