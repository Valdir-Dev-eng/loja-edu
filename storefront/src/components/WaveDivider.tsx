interface WaveDividerProps {
  position: "top" | "bottom";
  className?: string;
}

const WAVE_PATH =
  "M0,40 C150,90 350,90 500,50 C650,10 850,10 1000,50 C1080,70 1150,80 1200,60 L1200,120 L0,120 Z";

export function WaveDivider({ position, className }: WaveDividerProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={position === "top" ? { transform: "scaleY(-1)" } : undefined}
    >
      <path d={WAVE_PATH} fill="currentColor" />
    </svg>
  );
}
