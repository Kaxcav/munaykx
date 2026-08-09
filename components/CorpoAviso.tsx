import { segmentarCorpo } from "@/lib/posts";

/**
 * Corpo de um aviso, renderizado com segurança.
 *
 * Nada de `dangerouslySetInnerHTML`: o texto vem de terceiro (organizador) e é
 * o React que escapa, por construção. `<script>alert(1)</script>` no corpo
 * aparece como os caracteres que são, não como tag — a defesa é nunca
 * interpretar marcação, não tentar filtrá-la.
 *
 * Link ganha `rel="nofollow ugc noreferrer"` porque é conteúdo de usuário: a
 * MUNAY não empresta reputação de domínio pro que um terceiro linkou.
 * `whitespace-pre-wrap` preserva a quebra de linha sem `<br>` na mão.
 */
export default function CorpoAviso({ corpo }: { corpo: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-petroleo/85">
      {segmentarCorpo(corpo).map((s, i) =>
        s.tipo === "link" ? (
          <a
            key={i}
            href={s.valor}
            rel="nofollow ugc noreferrer"
            target="_blank"
            className="underline decoration-petroleo/30 underline-offset-4 hover:decoration-petroleo"
          >
            {s.valor}
          </a>
        ) : (
          <span key={i}>{s.valor}</span>
        ),
      )}
    </p>
  );
}
