'use client';

import { forwardRef, useEffect, useRef } from 'react';

/**
 * Auto-growing textarea — expands to fit content, never shows a scrollbar.
 *
 * Use anywhere you'd use <textarea>. Same props.
 *   <AutoTextarea value={x} onChange={...} className="lg" placeholder="…" />
 */
const AutoTextarea = forwardRef(function AutoTextarea(
  { value, onChange, minHeight, style, onInput, ...rest },
  externalRef
) {
  const innerRef = useRef(null);
  const ref = externalRef || innerRef;

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const target = Math.max(
      typeof minHeight === 'number' ? minHeight : 0,
      el.scrollHeight + 2
    );
    el.style.height = target + 'px';
  }

  useEffect(() => { resize(); /* eslint-disable-next-line */ }, [value]);
  useEffect(() => {
    const t = setTimeout(resize, 0); // after CSS-driven min-height applies
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, []);

  return (
    <textarea
      ref={ref}
      value={value ?? ''}
      onChange={(e) => { onChange && onChange(e); resize(); }}
      onInput={(e) => { onInput && onInput(e); resize(); }}
      style={{
        resize: 'none',
        overflow: 'hidden',
        ...(minHeight ? { minHeight } : null),
        ...(style || {}),
      }}
      {...rest}
    />
  );
});

export default AutoTextarea;
