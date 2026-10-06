import type { CSSProperties } from "react";
import type { Status } from "../candidaturas/tipos";

/** Define --cor com a cor do Status (as cores vivem em globals.css). */
export const corDe = (status: Status) => ({ "--cor": `var(--s-${status})` }) as CSSProperties;
