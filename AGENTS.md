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
- WordPress/WooCommerce (`https://store.javagadget.com`, overridable via `WP_SITE_URL`) are reached only via `src/lib/gateway.server.ts` (direct WP REST API v2 + WooCommerce REST API v3 with automatic public Store API v1 fallback for catalog reads), exposed through `src/lib/store.functions.ts` and `src/lib/queries.ts`. Why: secrets stay server-side and UI stays API-agnostic.
- Raw WP/Woo JSON is mapped to DTOs in `src/lib/store.server.ts` before leaving the server. Why: small payloads, stable UI types.
- Checkout creates a pending Woo order server-side (shipping cost resolved server-side) then redirects to Woo `payment_url`. Why: payment stays on the store's gateway.
- Order lookup requires order number + matching billing email (no WP JWT plugin installed). Why: no customer password auth available via REST.
- Cart is client-side (`src/lib/cart.ts`), pure math in `cart-math.ts` with tests.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.agents/skills/antislop/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->
