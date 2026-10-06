"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/mestre", rotulo: "Currículo mestre" },
  { href: "/candidaturas", rotulo: "Candidaturas" },
];

export function Navegacao() {
  const atual = usePathname();
  return (
    <nav className="topo" aria-label="Principal">
      <span className="marca">Resume Forge</span>
      <ul>
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={atual === l.href || atual.startsWith(`${l.href}/`) ? "page" : undefined}>
              {l.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
