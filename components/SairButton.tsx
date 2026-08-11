"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function SairButton() {
  const router = useRouter();
  return (
    // `variant="link"` sem sublinhado e com altura zerada: no header ele
    // precisa parecer o item de navegação que sempre foi, não um terceiro
    // botão ao lado de "Minha conta". O que muda é a origem do estilo, não
    // o desenho.
    <Button
      variant="link"
      className="h-auto p-0 font-medium text-foreground/60 no-underline hover:text-foreground hover:no-underline"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sair
    </Button>
  );
}
