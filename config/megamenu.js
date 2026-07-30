/**
 * MEGA MENU DATA SOURCE
 *
 * The single place where mega menu taxonomy is declared. Templates never hardcode
 * menu content — they render whatever `services/megamenuService` resolves from here.
 *
 * The shape mirrors the database intentionally:
 *   tab.groups[]  ->  `categories` row  (slug, name, display_order, is_active)
 *   group.products[] -> `products` rows joined to `product_images`
 *
 * "By Concern" vs "By Product" is the only concept the schema has no column for, so
 * each tab simply lists the category slugs that belong to it. When a `nav_group`
 * column is added, `megamenuService` groups by that column instead and this file
 * shrinks to presentation defaults — the view model, and therefore the UI, is unchanged.
 *
 * Live catalog: set `SOURCE: 'database'` in services/megamenuService.js (already set for go-live).
 * Tab grouping still comes from this file until a nav_group column exists.
 */

/**
 * Placeholder imagery. Locally served so the menu never depends on a third party
 * and never renders an unrelated stock photo. Replace each `image` with the real
 * asset path, or let the database supply `product_images.image_url`.
 */
const PLACEHOLDER_FALLBACK = '/assets/images/megamenu/placeholder-1.svg';

const IMG = {
  capsule: '/assets/images/megamenu/placeholder-1.svg',
  bottle: '/assets/images/megamenu/placeholder-2.svg',
  softgel: '/assets/images/megamenu/placeholder-3.svg',
  sachet: '/assets/images/megamenu/placeholder-4.svg'
};

module.exports = {
  enabled: true,

  /**
   * 'placeholder' — products are demo data, so links resolve to the shop landing page
   *                 instead of 404-ing on slugs that do not exist yet.
   * 'live'        — links resolve to /shop/category/:slug and /shop/product/:slug.
   * Flip this the same day the database rows exist.
   */
  linkMode: 'live',

  /** Hard cap enforced by the service so the grid never overflows its 6 columns. */
  maxProductsPerGroup: 6,

  placeholderFallbackImage: PLACEHOLDER_FALLBACK,

  viewAll: {
    label: 'View All',
    url: '/shop'
  },

  tabs: [
    {
      id: 'concern',
      label: 'By Concern',
      groups: [
        {
          slug: 'skin',
          label: 'Skin',
          products: [
            { slug: 'l-glutathione-capsules', name: 'L-Glutathione Capsules', image: IMG.capsule },
            { slug: 'marine-collagen-powder', name: 'Marine Collagen (powder)', image: IMG.bottle },
            { slug: 'hydrogel-eye-patches', name: 'Hydrogel Eye Patches', image: IMG.softgel },
            {
              slug: 'marine-collagen-unflavoured-powder',
              name: 'Marine Collagen (Unflavoured) powder',
              image: IMG.sachet
            }
          ]
        },
        {
          slug: 'hair',
          label: 'Hair',
          products: [
            {
              slug: 'hair-growth-with-biotin-capsules',
              name: 'Hair Growth with Biotin Capsules',
              image: IMG.capsule
            }
          ]
        },
        {
          slug: 'lifestyle',
          label: 'Lifestyle',
          products: [
            { slug: 'omega-3-with-astaxanthin', name: 'Omega 3 with Astaxanthin', image: IMG.softgel },
            {
              slug: 'magnesium-with-d3-k2-zinc',
              name: 'Magnesium with D3, K2 & Zinc',
              image: IMG.bottle
            },
            { slug: 'lung-liver-detox-capsules', name: 'Lung & Liver Detox Capsules', image: IMG.capsule },
            {
              slug: 'testosterone-booster-capsules-for-men',
              name: 'Testosterone Booster Capsules for Men',
              image: IMG.sachet
            },
            { slug: 'coq10-capsules', name: 'CoQ10 Capsules', image: IMG.capsule }
          ]
        }
      ]
    },
    {
      id: 'product',
      label: 'By Product',
      groups: [
        {
          slug: 'collagen',
          label: 'Collagen',
          products: [
            { slug: 'collagen-reglow', name: 'Collagen Reglow', image: IMG.bottle },
            {
              slug: 'collagen-naked-unflavoured',
              name: 'Collagen Naked (Unflavoured)',
              image: IMG.sachet
            }
          ]
        },
        {
          slug: 'capsules',
          label: 'Capsules',
          products: [
            { slug: 'keranat-hair-capsules', name: 'Keranat™ Hair Capsules', image: IMG.capsule },
            { slug: 'gluta-skin-capsules', name: 'Gluta Skin Capsules', image: IMG.softgel },
            { slug: 'mag-5x-pro', name: 'Mag 5X Pro', image: IMG.bottle },
            { slug: 'omega-3-4x-with-astaxanthin', name: 'Omega-3 4X with Astaxanthin', image: IMG.softgel },
            { slug: 'core-detox', name: 'Core Detox', image: IMG.sachet },
            { slug: 'mojo', name: 'Mojo', image: IMG.capsule }
          ]
        }
      ]
    }
  ]
};
