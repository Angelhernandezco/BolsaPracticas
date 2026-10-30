import { useState, type FormEvent } from "react";
import { Field, Input } from "./ui";

interface CareerFormProps {
  initialName?: string;
  disabled: boolean;
  error: string;
  onSubmit: (name: string) => Promise<void>;
}

export default function CareerForm({ initialName = "", disabled, error, onSubmit }: CareerFormProps) {
  const [name, setName] = useState(initialName);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled) void onSubmit(name.trim());
  }
  return (
    <form id="career-form" onSubmit={submit}>
      <Field label="Nombre de la carrera">
        <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} disabled={disabled} />
      </Field>
      {error && <div className="notice warning" role="alert">{error}</div>}
    </form>
  );
}
