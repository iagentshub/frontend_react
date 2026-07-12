import { useEffect } from "react";

export function useLoginBody() {
  useEffect(() => {
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, []);
}
