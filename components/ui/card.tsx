import React from 'react';

export function Card({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`px-4 pt-4 ${className}`}>{children}</div>;
}

export function CardTitle({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <h3 className={`text-base font-semibold text-slate-800 ${className}`}>{children}</h3>;
}

export function CardDescription({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <p className={`text-sm text-slate-500 ${className}`}>{children}</p>;
}

export function CardContent({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>;
}

export function CardFooter({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`px-4 pb-4 ${className}`}>{children}</div>;
}
