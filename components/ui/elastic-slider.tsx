"use client";

// Thanks @radix-ui — the elastic slider (moti/positive-motion variants)
// re-implemented without any motion library. Springs are CSS cubic
// beziers on width/transform/opacity transitions; the rubber-band edge
// is step-mutated inline styles while dragging and a transitioned reset
// on release. Same a11y surface: role="slider", arrow/Home/End keys,
// Shift for 10x nudges, click snapping, and a reduced-motion fallback.

import * as React from "react";
import {
  useCallback,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import { useControllableState } from "@/hooks/use-controllable-state";

// Drag detection & rubber band
const CLICK_THRESHOLD = 3;
const DEAD_ZONE = 32;
const MAX_CURSOR_RANGE = 200;
const MAX_STRETCH = 8;
/** Overshooting cubic-bezier — reads as a spring for fill/handle settles. */
const SPRING_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// Layout offsets used by the "handle dodges label/value" calculation.
const HANDLE_BUFFER = 8;
const LABEL_OFFSET = 12 + 4;
const VALUE_OFFSET = 12 - 8;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function decimalsForStep(step: number): number {
  const s = step.toString();
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

function roundValue(val: number, step: number): number {
  const raw = Math.round(val / step) * step;
  return parseFloat(raw.toFixed(decimalsForStep(step)));
}

// Magnetic snap to the nearest decile when within 3.125% of it.
function snapToDecile(rawValue: number, min: number, max: number): number {
  const normalized = (rawValue - min) / (max - min);
  const nearest = Math.round(normalized * 10) / 10;
  if (Math.abs(normalized - nearest) <= 0.03125) {
    return min + nearest * (max - min);
  }
  return rawValue;
}

/**
 * Safe outside-the-browser twin of React's useLayoutEffect (SSR no-op),
 * same guard the controllable-state hook applies internally.
 */
const useSSRSafeLayoutEffect = globalThis?.document
  ? React.useLayoutEffect
  : () => {};

export type ElasticSliderProps = {
  /** Label shown inside the track. */
  label: string;

  /** Controlled value. Use together with `onValueChange`. */
  value?: number;
  /** Initial value for uncontrolled mode. Falls back to `min`. */
  defaultValue?: number;
  /** Called with the new value on drag, click, or key press. */
  onValueChange?: (value: number) => void;

  /** Minimum value. */
  min?: number;
  /** Maximum value. */
  max?: number;
  /** Smallest increment. */
  step?: number;
  /** Format the displayed value. Defaults to `value.toFixed(...)` based on `step`. */
  formatValue?: (value: number) => string;

  className?: string;
  /** Accessible name. Falls back to `label`. */
  "aria-label"?: string;
};

export function ElasticSlider({
  label,

  value: valueProp,
  defaultValue,
  onValueChange,

  min = 0,
  max = 1,
  step = 0.01,
  formatValue,

  className,
  "aria-label": ariaLabel,
}: ElasticSliderProps) {
  const [value = min, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue ?? min,
    onChange: onValueChange,
  });

  const [prefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  /** Ring only for Tab focus or keyboard value nudges, not pointer press/drag. */
  const [keyboardFocusRing, setKeyboardFocusRing] = useState(false);

  // Pointer session state — mutable, does not trigger re-renders.
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const pendingPointerFocusRef = useRef(false);
  const isClickRef = useRef(true);
  const wrapperRectRef = useRef<DOMRect | null>(null);
  const scaleRef = useRef(1);
  /** Timeout that clears the settle transition so the next drag is 1:1. */
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const percentage = ((value - min) / (max - min)) * 100;
  const isActive = isInteracting || isHovered;
  const displayValue = formatValue
    ? formatValue(value)
    : value.toFixed(decimalsForStep(step));

  // Rubber band: nominally the track is inset-0; while the pointer is
  // past an edge, styles are mutated directly (1:1 with the finger).
  const applyStretch = useCallback((s: number) => {
    const track = trackRef.current;
    if (!track) return;
    if (s === 0) {
      track.style.width = "";
      track.style.transform = "";
    } else {
      track.style.width = `calc(100% + ${Math.abs(s).toFixed(2)}px)`;
      track.style.transform = s < 0 ? `translateX(${s.toFixed(2)}px)` : "";
    }
  }, []);

  const computeRubberStretch = useCallback((clientX: number, sign: number) => {
    const rect = wrapperRectRef.current;
    if (!rect) return 0;

    const distancePast = sign < 0 ? rect.left - clientX : clientX - rect.right;
    const overflow = Math.max(0, distancePast - DEAD_ZONE);

    return (
      sign * MAX_STRETCH * Math.sqrt(Math.min(overflow / MAX_CURSOR_RANGE, 1))
    );
  }, []);

  const positionToValue = useCallback(
    (clientX: number) => {
      const rect = wrapperRectRef.current;
      if (!rect) return min;

      const sceneX = (clientX - rect.left) / scaleRef.current;
      const nativeWidth = wrapperRef.current?.offsetWidth ?? rect.width;
      const percent = clamp(sceneX / nativeWidth, 0, 1);

      return clamp(min + percent * (max - min), min, max);
    },
    [min, max],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      pointerDownPos.current = { x: e.clientX, y: e.clientY };

      isClickRef.current = true;

      // Make pointer follow instant again: drop any settle transition.
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      setIsInteracting(true);
      setIsDragging(false);

      pendingPointerFocusRef.current = true;
      setKeyboardFocusRing(false);

      // Pointer interactions should move focus to the slider so subsequent
      // keyboard input is received and focus styles match the active state.
      trackRef.current?.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        pendingPointerFocusRef.current = false;
      });

      // Snapshot the wrapper rect so later math is immune to layout shifts.
      const wrapper = wrapperRef.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        wrapperRectRef.current = rect;
        scaleRef.current = rect.width / wrapper.offsetWidth;
      }
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isInteracting || !pointerDownPos.current) return;

      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;

      if (isClickRef.current && Math.hypot(dx, dy) > CLICK_THRESHOLD) {
        isClickRef.current = false;
        setIsDragging(true);
      }

      if (isClickRef.current) return;

      if (!prefersReducedMotion && wrapperRectRef.current) {
        const rect = wrapperRectRef.current;
        if (e.clientX < rect.left) {
          applyStretch(computeRubberStretch(e.clientX, -1));
        } else if (e.clientX > rect.right) {
          applyStretch(computeRubberStretch(e.clientX, 1));
        } else {
          applyStretch(0);
        }
      }

      setValue(roundValue(positionToValue(e.clientX), step));
    },
    [
      isInteracting,
      positionToValue,
      setValue,
      step,
      applyStretch,
      computeRubberStretch,
      prefersReducedMotion,
    ],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isInteracting) return;

      if (isClickRef.current) {
        // Coarse sliders (≤10 positions) snap to the nearest step;
        // continuous sliders keep the decile-magnetic behavior.
        const rawValue = positionToValue(e.clientX);
        const discreteSteps = (max - min) / step;
        const snapped =
          discreteSteps <= 10
            ? clamp(min + Math.round((rawValue - min) / step) * step, min, max)
            : snapToDecile(rawValue, min, max);

        setValue(roundValue(snapped, step));
      }

      const track = trackRef.current;
      if (track && !prefersReducedMotion) {
        // Context switch: a CSS transition takes over the styles pinned
        // during the drag, then is dropped again so the next drag stays
        // 1:1 with the pointer.
        track.style.transition = `width 300ms ${SPRING_EASE}, transform 300ms ${SPRING_EASE}`;
        applyStretch(0);
        settleTimerRef.current = setTimeout(() => {
          track.style.transition = "";
          settleTimerRef.current = null;
        }, 320);
      } else {
        applyStretch(0);
      }

      setIsInteracting(false);
      setIsDragging(false);
      pointerDownPos.current = null;
    },
    [
      isInteracting,
      positionToValue,
      setValue,
      min,
      max,
      step,
      applyStretch,
      prefersReducedMotion,
    ],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Shift + Arrow is a Figma-style fast nudge: jumps by 10x the step,
      // independent of the WAI-ARIA Page step (which scales with range).
      const arrowStep = e.shiftKey ? step * 10 : step;

      let next: number | null = null;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          next = value + arrowStep;
          break;

        case "ArrowLeft":
        case "ArrowDown":
          next = value - arrowStep;
          break;

        case "Home":
          next = min;
          break;

        case "End":
          next = max;
          break;

        default:
          return;
      }

      e.preventDefault();

      setKeyboardFocusRing(true);

      const snapped = roundValue(clamp(next, min, max), step);
      setValue(snapped);
    },
    [value, min, max, step, setValue],
  );

  const handleTrackFocus = useCallback(() => {
    if (!pendingPointerFocusRef.current) {
      setKeyboardFocusRing(true);
    }
  }, []);

  const handleTrackBlur = useCallback(() => {
    setKeyboardFocusRing(false);
  }, []);

  // Measure label + value to derive "dodge" thresholds so the handle fades
  // when it would overlap either text.
  const [dodge, setDodge] = useState({ left: 38, right: 72 });

  useSSRSafeLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const measure = () => {
      const trackWidth = wrapper.offsetWidth;
      if (trackWidth <= 0) return;

      const labelEl = labelRef.current;
      const valueEl = valueRef.current;

      const left = labelEl
        ? ((LABEL_OFFSET + labelEl.offsetWidth + HANDLE_BUFFER) / trackWidth) *
          100
        : 38;

      const right = valueEl
        ? ((trackWidth - VALUE_OFFSET - valueEl.offsetWidth - HANDLE_BUFFER) /
            trackWidth) *
          100
        : 72;

      setDodge((prev) => {
        return prev.left === left && prev.right === right
          ? prev
          : { left, right };
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);

    if (labelRef.current) observer.observe(labelRef.current);
    if (valueRef.current) observer.observe(valueRef.current);

    return () => observer.disconnect();
  }, [label, displayValue]);

  const valueDodge = percentage < dodge.left || percentage > dodge.right;

  const discreteSteps = (max - min) / step;
  const hashMarkCount = discreteSteps <= 10 ? discreteSteps - 1 : 9;

  const hashMarkPct = (i: number) => {
    return discreteSteps <= 10
      ? (((i + 1) * step) / (max - min)) * 100
      : (i + 1) * 10;
  };

  const fillSpring = !isDragging
    ? "transition-[width] duration-300 motion-reduce:transition-none"
    : "";
  const handleSpring = !isDragging
    ? "transition-[left,opacity,transform] duration-200 motion-reduce:transition-none"
    : "";
  const scaleX = isActive ? "scale-x-100" : "scale-x-25";
  const scaleY = valueDodge ? "scale-y-75" : "scale-y-100";
  const opacity = !isActive
    ? "opacity-0"
    : valueDodge
      ? "opacity-10"
      : isDragging
        ? "opacity-80"
        : "opacity-50";

  return (
    <div
      ref={wrapperRef}
      data-slot="elastic-slider"
      className={cn(
        "[--elastic-slider-height:--spacing(9)] [--elastic-slider-radius:var(--radius-lg)]",
        "[--elastic-slider-bg:var(--muted)]",
        "[--elastic-slider-fill:var(--muted-foreground)]/10",
        "[--elastic-slider-fill-active:var(--muted-foreground)]/20",
        "[--elastic-slider-hash-marks:var(--muted-foreground)]/30",
        "[--elastic-slider-handle:var(--foreground)]",
        "[--elastic-slider-label:var(--muted-foreground)]",
        "[--elastic-slider-focus:var(--foreground)]",
        "relative h-(--elastic-slider-height)",
        className,
      )}
    >
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        data-slot="elastic-slider-track"
        data-active={isActive}
        data-focus-visible={keyboardFocusRing}
        aria-label={ariaLabel ?? label}
        aria-orientation="horizontal"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        className={cn(
          "group/elastic-slider absolute inset-0 cursor-pointer touch-none overflow-hidden rounded-(--elastic-slider-radius) bg-(--elastic-slider-bg) outline-none select-none",
          "data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-ring/50 data-[focus-visible=true]:ring-offset-1 data-[focus-visible=true]:ring-offset-background",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onFocus={handleTrackFocus}
        onBlur={handleTrackBlur}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          data-slot="elastic-slider-hash-marks"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          {Array.from({ length: hashMarkCount }, (_, i) => (
            <div
              key={i}
              className={cn(
                "absolute top-1/2 h-2 w-px -translate-1/2 rounded-full transition-colors duration-200",
                "bg-transparent group-data-[active=true]/elastic-slider:bg-(--elastic-slider-hash-marks)",
              )}
              style={{ left: `${hashMarkPct(i)}%` }}
            />
          ))}
        </div>

        <div
          data-slot="elastic-slider-fill"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 transition-colors",
            "bg-(--elastic-slider-fill) group-data-[active=true]/elastic-slider:bg-(--elastic-slider-fill-active)",
            fillSpring,
          )}
          style={{ width: `${percentage}%` }}
        />

        <div
          data-slot="elastic-slider-handle"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-(--elastic-slider-handle)",
            scaleX,
            scaleY,
            opacity,
            handleSpring,
          )}
          style={{
            left: `max(4px, calc(${percentage}% - 8px))`,
            transitionTimingFunction: !isDragging
              ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
              : undefined,
          }}
        />

        <span
          ref={labelRef}
          data-slot="elastic-slider-label"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 inline-flex -translate-y-1/2 items-center text-sm/none font-medium text-(--elastic-slider-label) transition-colors"
        >
          {label}
        </span>

        <span
          ref={valueRef}
          data-slot="elastic-slider-value"
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-sm/none font-medium transition-colors",
            "text-(--elastic-slider-label) group-data-[active=true]/elastic-slider:text-(--elastic-slider-focus)",
          )}
        >
          {displayValue}
        </span>
      </div>
    </div>
  );
}
