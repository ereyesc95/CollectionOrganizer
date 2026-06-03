import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

interface Props {
  text: string;
  className?: string;
}

/** Scrolls overflowing text horizontally with pauses (billboard / ticker style). */
export default function MarqueeText({ text, className = "" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [scrollPx, setScrollPx] = useState(0);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;

    const check = () => {
      const available = wrap.clientWidth;
      const needed = measure.scrollWidth;
      const over = needed > available + 1;
      setOverflows(over);
      setScrollPx(over ? needed - available : 0);
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={wrapRef}
      className={`marquee${overflows ? " marquee--scroll" : ""} ${className}`.trim()}
      style={
        overflows
          ? ({ "--marquee-distance": `${scrollPx}px` } as CSSProperties)
          : undefined
      }
    >
      {overflows ? (
        <div className="marquee-track">
          <span className="marquee-text">{text}</span>
        </div>
      ) : (
        <span className="marquee-text">{text}</span>
      )}
      <span ref={measureRef} className="marquee-measure" aria-hidden>
        {text}
      </span>
    </div>
  );
}
