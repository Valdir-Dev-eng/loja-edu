# Implementação final: banners de Promoções/Lançamentos em HTML/CSS real

## Contexto

Os PNGs de referência (`banner_promocoes_v2.png`, `banner_lancamentos_v2.png`) estão em `storefront/assets/branding/` — **são só referência visual pra copiar o estilo (cores, formas, composição), não devem ser usados como imagem de fundo no site.** Esta entrega é recriar esse visual como componente React real (HTML/CSS puro). Motivo: texto sempre em HTML de verdade (regra já estabelecida desde o início do projeto) — permite editar desconto/texto sem gerar imagem nova pra cada mudança, é responsivo, acessível e indexável, e o número de desconto/quantidade de lançamentos fica automaticamente sincronizado com o catálogo real, sem precisar redesenhar nada.

## Banner de Promoções — recriar em código

Referência visual (anexo a este prompt): fundo branco, headline "Promoções" (vermelho `#C00612`) + "da semana" (cinza escuro `#1A1A1A`) em duas linhas, texto secundário em cinza (`--color-text-muted`), selo circular vermelho sólido à direita ("ATÉ" + "20% OFF", texto branco), curva/forma vermelha decorativa no rodapé do banner (dois círculos vermelhos sobrepostos criando uma onda), botão CTA vermelho "Ver ofertas" sobre a curva.

**Implementação:**
- Estrutura: `<section className="promo-banner">` com o texto à esquerda, selo circular como elemento posicionado à direita (`position: absolute` ou grid), forma decorativa via `border-radius`/`clip-path` ou 2 pseudo-elementos elípticos posicionados (`::before`/`::after`), não uma imagem.
- O texto "20% OFF" no selo deve refletir o **maior desconto real** entre os produtos da seção Promoções (calculado a partir de `promotions` já retornado por `/product/highlights`) — não hardcoded. Se os produtos tiverem descontos diferentes, mostrar o maior ("Até X% OFF").
- CTA "Ver ofertas" leva para `/produtos`.
- **Foto real do produto como elemento decorativo:** posicionar a foto já integrada via Sirv (a mesma usada no cartão "Sorofarma Analgésico"/"Vitamina C", ou uma nova se o admin cadastrar) como imagem lateral/de fundo sutil no banner (ex.: canto direito, atrás ou ao lado do selo, com leve transparência ou recorte), similar à composição das peças reais do cliente (texto de um lado, produto do outro). Se não houver imagem de produto disponível no momento da renderização, o banner funciona só com o layout de texto/forma (não quebra sem foto).

## Banner de Lançamentos — recriar em código

Mesmo princípio: fundo branco, curva vermelha decorativa no **topo** (variação do mesmo elemento), tag "NOVIDADE" em pílula vermelha, headline "Chegou na Sorofarma" (cinza escuro), texto secundário, CTA vermelho "Ver novidades" → `/produtos`.

## Onde os componentes vivem

- `storefront/src/components/PromoBanner.tsx` (novo) — recebe `promotions: ProductOutput[]` como prop, calcula o maior desconto, renderiza o banner. Usado dentro da seção condicional já existente (`{promotions.length > 0 && <PromoBanner promotions={promotions} />}`).
- `storefront/src/components/NewArrivalsBanner.tsx` (novo) — mesmo padrão para lançamentos.
- Estilos em `theme.css`/`index.css`, reaproveitando as variáveis de cor já existentes (`--color-primary`, `--color-text`, `--color-text-muted`) — nada de cor hardcoded solta no componente.

## Fotos reais do cliente — uso adicional

Além da foto de produto já integrada via Sirv, o cliente forneceu peças promocionais completas (com pessoas, ambiente de farmácia) — essas **não** viram banner do site (têm texto embutido, não editável, já decidido antes). Mas a peça institucional limpa (logo + 3 pontos "Cuidado/Confiança/Compromisso") pode servir de referência visual adicional para a seção de confiança que já existe na Home — conferir se o estilo de ícone atual está alinhado, ajustar sutilmente se fizer sentido, sem reabrir o design todo dessa seção.

## Aceite

- Os dois banners renderizam via HTML/CSS real (inspecionável no DevTools como texto, não `<img>` de banner inteiro).
- Desconto no selo reflete dado real dos produtos, não hardcoded.
- Foto de produto real aparece de forma decorativa no banner de Promoções quando disponível.
- Ambos continuam condicionais (só aparecem com dado real).
- Build do Vite sem erro, typecheck limpo.
