'use client';

import { useState } from 'react';

export function useSelection<T extends string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  function toggle(id: T) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: T[]) {
    setSelected((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }

  function clear() {
    setSelected(new Set());
  }

  return {
    selected,
    isSelected: (id: T) => selected.has(id),
    toggle,
    toggleAll,
    clear,
    count: selected.size,
  };
}
