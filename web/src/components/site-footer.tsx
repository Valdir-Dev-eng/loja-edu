import Link from "next/link";
import { STORE_CONTACT } from "@/lib/store-contact";

const INSTITUTIONAL_LINKS = [
  { href: "/produtos", label: "Todos os produtos" },
  { href: "/pedidos", label: "Meus pedidos" },
  { href: "/enderecos", label: "Meus endereços" },
];

// Calculado uma vez no build (constante de módulo), não a cada render —
// evita "new Date() antes de acessar dado de request" do Cache Components.
const CURRENT_YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary">
      <div className="mx-auto grid w-full max-w-(--content-max-width) gap-8 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-3">
        <div>
          <span className="font-sans text-xl font-extrabold text-brand-red">
            Sorofarma
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            Sorocaba merece esse cuidado.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-brand-red">
            Atendimento
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">{STORE_CONTACT.address}</p>
          <p className="mt-2 text-sm text-muted-foreground">{STORE_CONTACT.whatsapp}</p>
        </div>

        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-brand-red">
            Institucional
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {INSTITUTIONAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-semibold text-foreground hover:text-brand-red"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-4 text-center font-sans text-sm font-semibold text-muted-foreground">
        © {CURRENT_YEAR} Sorofarma. Todos os direitos reservados.
      </div>
    </footer>
  );
}
