import { useState, type PointerEvent } from "react";
import { m, useReducedMotion } from "motion/react";

const nodes = [
  { id: "core", x: 300, y: 205, r: 42, label: "iAgents" },
  { id: "models", x: 118, y: 92, r: 24, label: "Models" },
  { id: "memory", x: 486, y: 84, r: 22, label: "Memory" },
  { id: "skills", x: 516, y: 292, r: 25, label: "Skills" },
  { id: "teams", x: 112, y: 315, r: 22, label: "Teams" },
  { id: "data", x: 300, y: 378, r: 18, label: "Data" },
] as const;

const edges = [
  ["core", "models"],
  ["core", "memory"],
  ["core", "skills"],
  ["core", "teams"],
  ["core", "data"],
  ["models", "memory"],
  ["skills", "data"],
  ["teams", "data"],
] as const;

export function AgentNetwork({ compact = false }: { compact?: boolean }) {
  const reduced = useReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function move(event: PointerEvent<HTMLDivElement>) {
    if (reduced || matchMedia("(pointer: coarse)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientX - box.left) / box.width - 0.5) * 12,
      y: ((event.clientY - box.top) / box.height - 0.5) * 12,
    });
  }

  return (
    <div
      className={`agent-network${compact ? " agent-network--compact" : ""}`}
      onPointerMove={move}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      aria-hidden="true"
    >
      <m.svg
        viewBox="0 0 600 430"
        role="presentation"
        focusable="false"
        animate={{ x: tilt.x, y: tilt.y }}
        transition={{ type: "spring", stiffness: 130, damping: 22 }}
      >
        <defs>
          <radialGradient id="network-core">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.34" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.04" />
          </radialGradient>
        </defs>

        <g className="agent-network-orbits">
          <ellipse cx="300" cy="210" rx="228" ry="154" />
          <ellipse cx="300" cy="210" rx="154" ry="222" transform="rotate(52 300 210)" />
        </g>

        <g className="agent-network-edges">
          {edges.map(([from, to], index) => {
            const a = nodes.find((node) => node.id === from)!;
            const b = nodes.find((node) => node.id === to)!;
            return (
              <m.line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                initial={false}
                animate={
                  reduced
                    ? { pathLength: 1, opacity: 0.45 }
                    : { pathLength: [0.18, 1, 0.18], opacity: [0.2, 0.7, 0.2] }
                }
                transition={{
                  duration: 3.2,
                  delay: index * 0.16,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            );
          })}
        </g>

        {nodes.map((node, index) => (
          <m.g
            className={`agent-network-node agent-network-node--${node.id}`}
            key={node.id}
            initial={false}
            animate={reduced ? { y: 0 } : { y: [0, index % 2 ? 5 : -5, 0] }}
            transition={{ duration: 4 + index * 0.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {node.id === "core" && (
              <circle className="agent-network-core-halo" cx={node.x} cy={node.y} r="82" />
            )}
            <circle className="agent-network-node-ring" cx={node.x} cy={node.y} r={node.r + 8} />
            <circle className="agent-network-node-dot" cx={node.x} cy={node.y} r={node.r} />
            <text x={node.x} y={node.y + 4} textAnchor="middle">
              {node.label}
            </text>
          </m.g>
        ))}
      </m.svg>
      <span className="agent-network-status">
        <i /> Live orchestration
      </span>
    </div>
  );
}
