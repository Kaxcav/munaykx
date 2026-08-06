import CommunityForm from "@/components/admin/CommunityForm";
import { salvarComunidade } from "../actions";

export default function NovaComunidadePage() {
  return (
    <>
      <p className="eyebrow mb-3">Comunidades</p>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Nova comunidade
      </h1>
      <div className="mt-8">
        <CommunityForm action={salvarComunidade.bind(null, null)} />
      </div>
    </>
  );
}
