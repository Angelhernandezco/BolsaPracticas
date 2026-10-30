import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { LoaderCircle, X } from "lucide-react";

export function Button({ children, variant = "primary", loading, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean }) {
  return <button className={`button button-${variant} ${className}`} {...props} disabled={props.disabled || loading}>{loading ? <LoaderCircle className="spin" size={18} /> : null}{children}</button>;
}

export function ControlButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={className} {...props}>{children}</button>;
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint ? <span className="field-hint">{hint}</span> : null}{error ? <span className="field-error">{error}</span> : null}</label>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return <input ref={ref} className="control" {...props} />;
});

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="control" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="control textarea" {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "neutral" | "info" | "danger" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Title({ as = "h1", children, className = "" }: { as?: "h1" | "h2" | "h3"; children: ReactNode; className?: string }) {
  const Component = as;
  return <Component className={`title title-${as} ${className}`}>{children}</Component>;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><Title as="h3">{title}</Title><p>{text}</p>{action}</div>;
}

export function Modal({ open, title, children, onClose, actions }: { open: boolean; title: string; children: ReactNode; onClose: () => void; actions: ReactNode }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><Title as="h2">{title}</Title><Button variant="ghost" aria-label="Cerrar" onClick={onClose}><X size={20} /></Button></div><div className="modal-body">{children}</div><div className="modal-actions">{actions}</div></div></div>;
}

export function LoadingState() {
  return <div className="loading-state"><LoaderCircle className="spin" size={28} /><span>Cargando información…</span></div>;
}

export function Avatar({ initials, src, size = "medium" }: { initials: string; src?: string; size?: "small" | "medium" | "large" }) {
  return <div className={`avatar avatar-${size}`}>{src ? <img src={src} alt="" /> : initials}</div>;
}
