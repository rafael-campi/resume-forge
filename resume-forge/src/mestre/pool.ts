import { bancoPronto } from "../db/pool";
import { criarRepositorioMestre } from "./repositorio";

export async function repositorioMestre() {
  return criarRepositorioMestre(await bancoPronto());
}
