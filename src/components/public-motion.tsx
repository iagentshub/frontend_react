import { Children, type ReactNode } from "react";
import { LazyMotion, MotionConfig, m, useReducedMotion } from "motion/react";

const loadMotionFeatures = () =>
  import("./public-motion-features").then((module) => module.default);

export function PublicMotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
  offset = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  offset?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced || typeof IntersectionObserver === "undefined") {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial={false}
      whileInView={{ opacity: [0, 1], y: [offset, 0] }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

export function Stagger({
  children,
  className,
  step = 0.06,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) => (
        <Reveal delay={index * step}>{child}</Reveal>
      ))}
    </div>
  );
}

export function PublicShell({
  children,
  className,
  intensity = "ambient",
}: {
  children: ReactNode;
  className?: string;
  intensity?: "ambient" | "quiet";
}) {
  return (
    <div className={`public-shell public-shell--${intensity}${className ? ` ${className}` : ""}`}>
      <div className="public-shell-grid" aria-hidden="true" />
      <div className="public-shell-glow" aria-hidden="true" />
      <div className="public-shell-content">{children}</div>
    </div>
  );
}
