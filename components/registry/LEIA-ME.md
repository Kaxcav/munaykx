# `components/registry/` — a QUARENTENA da CLI do shadcn

Esta pasta é o **balde de entrada**, não o design system. Nada aqui é
importado por tela nenhuma, e nada aqui é commitado (o `.gitignore` do lado
cuida disso — só este arquivo sobrevive).

## Por que a CLI aponta pra cá

O `components.json` tem `"aliases": { "ui": "@/components/registry" }` e
`"cssVariables": false`. Os dois de propósito:

- **`aliases.ui` → `registry/`**: o `npx shadcn add X` NUNCA escreve em
  `components/ui/`. Os componentes de lá já foram traduzidos pra marca e pra
  API em português da MUNAY — deixar a CLI sobrescrever `button.tsx` apagaria
  o `hover:bg-lime`, o raio de pílula e o comentário que explica por que este
  botão não usa Radix Slot. A CLI é um **buscador de código atualizado**, não
  a dona do tema.
- **`cssVariables: false`**: senão a CLI gera o bloco `:root` dela em
  `app/globals.css`. O nosso é **calculado** a partir de `lib/brand.ts` por
  `lib/tema.ts`, e `tests/tema.spec.ts` compara os dois — a CLI escrevendo
  ali deixaria o CI vermelho e, pior, trocaria a paleta da marca por
  `neutral`.

## O fluxo

```
npx shadcn@latest add dialog
  ↓ cai em components/registry/dialog.tsx        (quarentena)
  ↓ checklist de port (docs/QUADRO-SHADCN-MUNAY.md § "Checklist de port")
  ↓ vira components/ui/dialog.tsx, na nossa API
  ↓ apaga o arquivo da quarentena
```

`npm run verificar:classes` é o portão mecânico do passo 2: ele recusa as
classes do Tailwind v4 (`shadow-xs`, `outline-hidden`, `ring-3`, `oklch()`…)
que a MUNAY, na 3.4, **não quebra — só renderiza errado em silêncio**.

Peça em quarentena não vai pro git. Se você está vendo um `.tsx` aqui num
diff, o port não terminou.
