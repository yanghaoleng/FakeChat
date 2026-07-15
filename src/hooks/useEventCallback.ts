import { useCallback, useLayoutEffect, useRef } from "react";

export function useEventCallback<Arguments extends unknown[], Result>(
  handler: (...arguments_: Arguments) => Result
) {
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  return useCallback((...arguments_: Arguments) => handlerRef.current(...arguments_), []);
}
