import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLoginBody } from "./use-login-body";
import "@/styles/routes/login/login.css";

export function AuthCard({ children }: { children: ReactNode }) {
  useLoginBody();
  const wide = useLocation().pathname.startsWith("/register");
  return (
    <main className="login-wrap login-wrap--narrow">
      <section className={`login-card${wide ? " login-card--wide" : ""}`}>
        <Link className="login-card-logo" to="/">iAgents<span>Hub</span></Link>
        {children}
      </section>
    </main>
  );
}

