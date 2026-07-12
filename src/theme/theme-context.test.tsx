import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./theme-context";

function ThemeProbe() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme("light-blue")}>{theme}</button>;
}

describe("ThemeProvider", () => {
  it("conserva las claves legacy y aplica el tema al documento", async () => {
    localStorage.setItem("ga-theme", "ocean");
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    const button = screen.getByRole("button", { name: "dark-blue" });
    await userEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe("light-blue");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("ga-theme")).toBe("light-blue");
  });
});
