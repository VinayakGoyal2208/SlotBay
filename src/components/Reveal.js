import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
export function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return _jsx("div", {
    ref: ref,
    style: { transitionDelay: `${delay}ms` },
    className: `reveal ${visible ? "reveal-visible" : ""} ${className}`,
    children: children,
  });
}
