import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "error";

async function copyWithFallback(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Secure-context clipboard access can be denied. Continue with the
    // selection-based browser fallback instead of leaving the button inert.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto -9999px";
  document.body.append(textarea);
  textarea.select();

  try {
    return typeof document.execCommand === "function" && document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export function PublicCodeBlock({
  command,
  label,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  variant = "console",
}: {
  command: string;
  label?: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
  variant?: "compact" | "console";
}) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (resetTimer.current !== undefined) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const copy = async () => {
    const copied = await copyWithFallback(command);
    setCopyState(copied ? "copied" : "error");
    if (resetTimer.current !== undefined) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState("idle"), 1500);
  };
  const currentLabel =
    copyState === "copied" ? copiedLabel : copyState === "error" ? copyFailedLabel : copyLabel;

  return (
    <>
      {label && <span className="public-code-block-label">{label}</span>}
      <div className={`public-code-block public-code-block--${variant}`}>
        <code className="public-code-block-code" tabIndex={0}>
          {command}
        </code>
        <button
          className="public-code-block-copy btn btn-ghost btn-sm"
          type="button"
          onClick={() => void copy()}
          aria-label={currentLabel}
        >
          {currentLabel}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {copyState === "idle" ? "" : currentLabel}
        </span>
      </div>
    </>
  );
}
