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
          slug: 'beauty',
          label: 'Beauty',
          products: [
            { slug: 'mh-skin-renewal-capsules', name: 'M&H Skin Renewal Capsules', image: IMG.capsule },
            { slug: 'mh-marine-collagen-powder', name: 'M&H Marine Collagen (powder)', image: IMG.bottle },
            { slug: 'mh-hydrogel-eye-patches', name: 'M&H Hydrogel Eye Patches', image: IMG.softgel },
            {
              slug: 'mh-naked-marine-collagen-unflavoured-powder',
              name: 'M&H Naked Marine Collagen (Unflavoured) powder',
              image: IMG.sachet
            },
            { slug: 'mh-hair-growth-capsules', name: 'M&H Hair Growth Capsules', image: IMG.capsule }
          ]
        },
        {
          slug: 'lifestyle',
          label: 'Lifestyle',
          products: [
            { slug: 'mh-omega-3-with-astaxanthin', name: 'M&H Omega-3 with Astaxanthin', image: IMG.softgel },
            {
              slug: 'mh-mag5x-pro-with-vitamin-d3-k2-zinc',
              name: 'M&H Mag5X Pro with Vitamin D3, K2 & Zinc',
              image: IMG.bottle
            },
            { slug: 'mh-lung-liver-core-detox', name: 'M&H Lung & Liver Core Detox', image: IMG.capsule },
            {
              slug: 'mh-testosterone-booster-capsules-for-men',
              name: 'M&H Testosterone Booster Capsules for Men',
              image: IMG.sachet
            },
            { slug: 'mh-coq10-with-bioperine', name: 'M&H CoQ10 with BioPerine®', image: IMG.capsule }
          ]
        },
        {
          slug: 'recovery',
          label: 'Recovery',
          products: [
            { slug: 'knee-support', name: 'Knee Support', image: IMG.bottle },
            { slug: 'ankle-support', name: 'Ankle Support', image: IMG.softgel },
            { slug: 'elbow-support', name: 'Elbow Support', image: IMG.capsule },
            { slug: 'ls-belt', name: 'LS Belt', image: IMG.sachet },
            { slug: 'digital-scale', name: 'Digital Scale', image: IMG.bottle }
          ]
        }
      ]
    },
    {
      id: 'product',
      label: 'By Product',
      groups: [
        {
          // Reuses Beauty category — no separate collagen category/SKUs
          slug: 'beauty',
          label: 'Collagen',
          products: [
            { slug: 'mh-marine-collagen-powder', name: 'M&H Marine Collagen (powder)', image: IMG.bottle },
            {
              slug: 'mh-naked-marine-collagen-unflavoured-powder',
              name: 'M&H Naked Marine Collagen (Unflavoured) powder',
              image: IMG.sachet
            }
          ]
        },
        {
          // Reuses Lifestyle category — no separate capsules category/SKUs
          slug: 'lifestyle',
          label: 'Capsules',
          products: [
            { slug: 'mh-omega-3-with-astaxanthin', name: 'M&H Omega-3 with Astaxanthin', image: IMG.softgel },
            {
              slug: 'mh-mag5x-pro-with-vitamin-d3-k2-zinc',
              name: 'M&H Mag5X Pro with Vitamin D3, K2 & Zinc',
              image: IMG.bottle
            },
            { slug: 'mh-lung-liver-core-detox', name: 'M&H Lung & Liver Core Detox', image: IMG.capsule },
            {
              slug: 'mh-testosterone-booster-capsules-for-men',
              name: 'M&H Testosterone Booster Capsules for Men',
              image: IMG.sachet
            },
            { slug: 'mh-coq10-with-bioperine', name: 'M&H CoQ10 with BioPerine®', image: IMG.capsule }
          ]
        }
      ]
    }
  ]
};
