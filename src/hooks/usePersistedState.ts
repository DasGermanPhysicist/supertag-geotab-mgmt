import { useState, useEffect } from 'react';

export function usePersistedState<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Get initial value from localStorage or use provided initialValue
  const [state, setState] = useState<T>(() => {
    const persistedValue = localStorage.getItem(key);
    return persistedValue ? JSON.parse(persistedValue) : initialValue;
  });

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}