import type { EstadoVaga } from "../../vagas/tipos";

const ROTULO: Record<EstadoVaga, string> = { analisando: "Analisando", pronta: "Pronta", erro: "Com erro" };

export function Estado({ estado }: { estado: EstadoVaga }) {
  return <span className="selo" data-estado={estado}>{ROTULO[estado]}</span>;
}
