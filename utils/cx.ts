import { twMerge } from "tailwind-merge";

// Lightweight class merger used across charts and components.
export const cx = twMerge;

// Helper to keep Tailwind IntelliSense happy when sorting class maps.
export function sortCx<T extends Record<string, unknown>>(classes: T): T {
    return classes;
}
