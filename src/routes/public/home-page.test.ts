import { describe, expect, it } from "vitest";
import { INSTALL_COMMAND, WINDOWS_INSTALL_COMMAND } from "./home-page";

describe("public installation commands", () => {
  it("uses the same Linux/macOS command for installation and updates", () => {
    expect(INSTALL_COMMAND).toBe(
      "curl -fsSL https://raw.githubusercontent.com/iagentshub/iAgents/main/install.sh | bash",
    );
    expect(INSTALL_COMMAND).not.toContain("IAGENTSHUB_MODE");
  });

  it("keeps the Windows PowerShell installer available", () => {
    expect(WINDOWS_INSTALL_COMMAND).toBe(
      "irm https://raw.githubusercontent.com/iagentshub/iAgents/main/install.ps1 | iex",
    );
    expect(WINDOWS_INSTALL_COMMAND).not.toContain("IAGENTSHUB_MODE");
  });
});
