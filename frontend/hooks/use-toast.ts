"use client";

/**
 * Minimal toast store + hook. Add toasts from anywhere with `toast({...})`.
 *
 * Adapted from the shadcn/ui example to keep our dependency footprint
 * small. Backed by a module-level subscription set so non-React callers
 * can still push toasts.
 */

import * as React from "react";
import type { ToastProps } from "@/components/ui/toast";

type ToastItem = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

interface ToastState {
  toasts: ToastItem[];
}

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5000;

let memory: ToastState = { toasts: [] };
const listeners = new Set<(state: ToastState) => void>();

function notify() {
  for (const l of listeners) l(memory);
}

function dismiss(id?: string) {
  memory = {
    toasts: memory.toasts.map((t) =>
      !id || t.id === id ? { ...t, open: false } : t,
    ),
  };
  notify();
}

function remove(id?: string) {
  memory = { toasts: id ? memory.toasts.filter((t) => t.id !== id) : [] };
  notify();
}

let counter = 0;
const nextId = () => {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return counter.toString();
};

export function toast(props: Omit<ToastItem, "id">) {
  const id = nextId();
  const item: ToastItem = {
    ...props,
    id,
    open: true,
    onOpenChange: (open) => {
      if (!open) dismiss(id);
    },
  };
  memory = { toasts: [item, ...memory.toasts].slice(0, TOAST_LIMIT) };
  notify();
  setTimeout(() => remove(id), TOAST_REMOVE_DELAY);
  return { id, dismiss: () => dismiss(id) };
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memory);
  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return { ...state, toast, dismiss };
}
