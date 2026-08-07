"use client";

import { Input } from "@/components/ui/input";

/**
 * Campo de formulário do perfil — rótulo, dica, erro e acessibilidade num
 * lugar só.
 *
 * Briefing 07/08/2026, item 8.3: "Feedback claro e imediato em cada campo,
 * com linguagem amigável — não mensagens de erro técnicas."
 *
 * O que este componente garante que um `<input>` solto não garantiria:
 *
 * · **`aria-invalid` + `aria-describedby`.** Sem isso, leitor de tela anuncia
 *   "campo CPF" e cala — a pessoa cega não fica sabendo que o campo está
 *   errado nem qual é o erro. Com isso, ele lê o erro junto do campo.
 * · **O erro só aparece depois do primeiro blur.** Marcar como inválido
 *   enquanto a pessoa digita o terceiro dígito do CPF é hostil: ela não
 *   errou, ela ainda não terminou.
 * · **A dica não some quando dá erro.** Some o contrário: dica e erro
 *   convivem, porque a dica é o que explica como consertar.
 */
export type CampoProps = {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  erro?: string | null;
  /** Explica POR QUE o campo existe — o item 8.3 pede transparência. */
  dica?: string;
  opcional?: boolean;
  tipo?: "text" | "email" | "tel" | "date";
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel";
  autoComplete?: string;
  maxLength?: number;
};

export default function Campo({
  id,
  rotulo,
  valor,
  onChange,
  onBlur,
  erro,
  dica,
  opcional = false,
  tipo = "text",
  placeholder,
  inputMode,
  autoComplete,
  maxLength,
}: CampoProps) {
  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;
  const descrito = [dica ? idDica : null, erro ? idErro : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {rotulo}
        {opcional && (
          <span className="ml-1.5 font-normal text-petroleo/45">opcional</span>
        )}
      </label>

      <Input
        id={id}
        name={id}
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descrito || undefined}
        className={
          erro ? "border-coral focus-visible:border-coral" : "border-petroleo/20"
        }
      />

      {dica && (
        <p id={idDica} className="mt-1.5 text-xs leading-relaxed text-petroleo/50">
          {dica}
        </p>
      )}
      {erro && (
        <p
          id={idErro}
          role="alert"
          className="mt-1.5 flex gap-1.5 text-xs font-medium text-coral"
        >
          <span aria-hidden>↳</span>
          {erro}
        </p>
      )}
    </div>
  );
}
