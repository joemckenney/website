import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { setAccessToken } from "../lib/auth";

export default function IndexPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle OAuth callback with access_token in URL
    const accessToken = searchParams.get("access_token");
    if (accessToken) {
      setAccessToken(accessToken);
      // Clear the token from URL and redirect
      navigate("/new", { replace: true });
      return;
    }

    // Handle OAuth error
    const error = searchParams.get("error");
    if (error) {
      navigate(`/login?error=${error}`, { replace: true });
      return;
    }

    navigate("/new", { replace: true });
  }, [navigate, searchParams]);

  return null;
}
