# Gamma Markets Bulk Updater

A spreadsheet-style bulk editor for your Nostr marketplace listings —
NIP-99 classifieds / [Gamma Markets spec](https://github.com/GammaMarkets/market-spec/blob/main/spec.md) (kind 30402).

## What it does

- Sign in with a NIP-07 browser extension or a NIP-46 bunker
- Imports all your published kind 30402 listings and shows them in an editable spreadsheet
- Inline-edit title, price, currency, stock, status, categories, location and summary per row
- **Images** — click a row's thumbnail to open the image editor:
  - Upload a file (via Blossom) or paste an image URL
  - Reorder with the up/down arrows — the first image is the listing's main image
  - Replace or remove individual images; pixel dimensions from an upload are kept
    in the `image` tag, and the sorting field is rewritten on publish
- Bulk toolbar for selected rows:
  - **Title** — find & replace, set, prefix, suffix
  - **Categories** — add, remove or replace `t` tags
  - **Price** — set amount/currency or adjust by percentage
  - **Status** — the three Gamma `visibility` values: on-sale / hidden / pre-order.
    The NIP-99 `status` tag is written alongside for classified clients
    (`sold` for hidden items, `active` otherwise) but never shown in the UI
  - **Shipping** — apply your published kind 30406 shipping options (`shipping_option` tags)
  - **Specs** — set a `spec` key/value on every selected listing, or remove a key.
    Each row's specs are also editable from its **Specs** column
  - **Duplicate** — clone listings; every new listing gets a fresh unique `d` identifier (UUID)
- Nothing is published until you hit **Publish** — edited rows are highlighted, and
  unmanaged tags (weight, dimensions, geohash, …) are preserved verbatim
- Republishing uses the same `d` tag, so relays replace the prior version automatically

## Built with

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Nostrify](https://nostrify.dev/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [MKStack](https://soapbox.pub/mkstack) (scaffolding)

## Getting started

**Prerequisites:** Node.js v18+ and a NIP-07 extension ([Alby](https://getalby.com) or [nos2x](https://github.com/fiatjaf/nos2x)) or a bunker URI.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
```

## License

MIT
