import { Outlet } from "react-router-dom";
import { MainNav } from "./main-nav";

export function AppShell() {
  return (
    <div className="app-shell">
      <MainNav />
      <Outlet />
    </div>
  );
}
