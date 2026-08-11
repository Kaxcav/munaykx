import CommunityForm from "@/components/admin/CommunityForm";
import { PaginaAdmin } from "@/components/admin/PaginaAdmin";
import { salvarComunidade } from "../actions";

export default function NovaComunidadePage() {
  return (
    <PaginaAdmin
      eyebrow="Comunidades"
      titulo="Nova comunidade"
    >
      <div className="mt-8">
        <CommunityForm action={salvarComunidade.bind(null, null)} />
      </div>
    </PaginaAdmin>
  );
}
