<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- White-label: all client-specific values live in `src/config/site.config.ts` + theme tokens in `src/styles.css`; components never hardcode brand/store data. Why: the codebase is a reusable multi-client template.
- WordPress/WooCommerce are reached only via the connector gateway in `src/lib/gateway.server.ts`, exposed through `src/lib/store.functions.ts` and `src/lib/queries.ts`. Why: secrets stay server-side and UI stays API-agnostic.
- Raw WP/Woo JSON is mapped to DTOs in `src/lib/store.server.ts` before leaving the server. Why: small payloads, stable UI types.
- Checkout creates a pending Woo order server-side (shipping cost resolved server-side) then redirects to Woo `payment_url`. Why: payment stays on the store's gateway.
- Order lookup requires order number + matching billing email (no WP JWT plugin installed). Why: no customer password auth available via REST.
- Cart is client-side (`src/lib/cart.ts`), pure math in `cart-math.ts` with tests.
