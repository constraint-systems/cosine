import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/icon")({
  component: IconGenerator,
});

function IconGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [amplitude, setAmplitude] = useState(50);
  const [frequency, setFrequency] = useState(2);
  const [phase, setPhase] = useState(0);
  const [strokeWidth, setStrokeWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw cosine wave
    ctx.strokeStyle = "white";
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();

    const centerY = canvas.height / 2;
    const points = 1000;

    for (let i = 0; i <= points; i++) {
      const x = (i / points) * canvas.width;
      const t = (i / points) * frequency * Math.PI * 2;
      const y = centerY + amplitude * Math.cos(t + phase);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }, [amplitude, frequency, phase, strokeWidth]);

  return (
    <div className="p-4">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-serif">Cosine Icon Generator</h1>

        <div className="flex flex-col gap-4">
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            className="border border-faint bg-bg"
          />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted flex justify-between">
                <span>Amplitude</span>
                <span>{amplitude}</span>
              </label>
              <input
                type="range"
                min="10"
                max="200"
                value={amplitude}
                onChange={(e) => setAmplitude(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted flex justify-between">
                <span>Frequency</span>
                <span>{frequency.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted flex justify-between">
                <span>Phase</span>
                <span>{phase.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max={Math.PI * 2}
                step="0.1"
                value={phase}
                onChange={(e) => setPhase(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-muted flex justify-between">
                <span>Stroke Width</span>
                <span>{strokeWidth}</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
