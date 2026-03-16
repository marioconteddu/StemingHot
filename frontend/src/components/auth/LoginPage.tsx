import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "../common/Button.tsx";
import { setToken } from "../../store/authStore.ts";
import { api } from "../../api/client.ts";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string }>("/auth/login", {
        username,
        password,
      });
      setToken(data.token);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Login failed");
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <div className="w-full max-w-sm rounded-xl border border-border bg-bg-secondary p-6 shadow-lg">
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt=""
            className="mx-auto mb-3 h-14 w-auto object-contain"
            aria-hidden
          />
          <h1 className="text-lg font-bold uppercase tracking-tight text-text-primary">
            <span className="brand-title-steming">STEMING</span>
            <span className="brand-title-hot">HOT</span>
          </h1>
          <p className="mt-1 text-xs text-text-muted">Stem Separation Studio</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder="Username"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              placeholder="Password"
              required
            />
          </div>
          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-[11px] text-text-muted">
            By signing in you agree to our{" "}
            <Link to="/terms" className="text-accent hover:underline">
              Terms and Conditions
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
};
