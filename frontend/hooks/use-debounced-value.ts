"use client";

import * as React from "react";

/**
 * Returns ``value`` after it has stayed unchanged for ``delayMs``
 * milliseconds. Used to keep API refetches from firing on every
 * keystroke as the user types in a search box.
 *
 * Default is 300ms — fast enough to feel responsive, slow enough that
 * a moderately fast typist (~5 chars/sec) triggers a single request
 * instead of one per character.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
