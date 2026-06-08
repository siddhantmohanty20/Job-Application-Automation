import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthPage } from "@/components/auth/auth-page";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/auth")({
  component: AuthRoute,
});

function AuthRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // if already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  return <AuthPage />;
}