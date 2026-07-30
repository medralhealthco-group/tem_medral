module.exports = {
  header: {
    announcementMessages: [
      'WHO-GMP Certified Manufacturing',
      'ISO Certified Facility',
      'Export Worldwide',
      'Private Label Manufacturing',
      'Free Shipping Above ₹999'
    ],
    menu: [
      {
        // Mega menu content lives in config/megamenu.js, resolved by services/megamenuService.
        id: 'shop',
        title: 'Shop All',
        url: '/shop',
        position: 'left',
        type: 'megamenu',
        order: 1
      },
      {
        id: 'science',
        title: 'Science',
        url: '#',
        position: 'left',
        type: 'link',
        order: 2
      },
      {
        id: 'manufacturing',
        title: 'B2B White Labeling',
        url: '/pages/b2b-white-labeling.html',
        position: 'left',
        type: 'link',
        order: 3
      },
      {
        id: 'about',
        title: 'About Us',
        url: '/pages/about-us.html',
        position: 'left',
        type: 'dropdown',
        order: 4,
        children: [
          { id: 'team', title: 'Team', url: '#' },
          { id: 'certifications', title: 'Certifications', url: '/pages/certifications.html' },
          { id: 'careers', title: 'Careers', url: '#' },
          { id: 'contact', title: 'Contact', url: '/pages/contact.html' }
        ]
      }
    ],
    searchSuggestions: ['Collagen', 'Biotin', 'Omega 3', 'Magnesium', 'Immunity', 'Sleep'],
    utilities: [
      { id: 'search', icon: 'search', label: 'Search', action: 'toggle-search' },
      {
        id: 'account',
        icon: 'user',
        label: 'Account',
        url: '/account/login',
        authenticatedUrl: '/account/dashboard',
        // Rendered inside the drawer instead of the bar on mobile.
        mobileBar: false
      },
      { id: 'cart', icon: 'shopping-bag', label: 'Cart', url: '/cart' }
    ]
  },
  footer: {
    quickLinks: [
      {
        id: 'certifications',
        title: 'Certifications',
        url: '/pages/certifications.html',
        enabled: true,
        target: '_self',
        rel: '',
        order: 1
      },
      {
        id: 'contact',
        title: 'Contact',
        url: '/pages/contact.html',
        enabled: true,
        target: '_self',
        rel: '',
        order: 2
      },
      {
        id: 'about',
        title: 'About Us',
        url: '/pages/about-us.html',
        enabled: true,
        target: '_self',
        rel: '',
        order: 3
      }
    ],
    company: [
      {
        id: 'blogs',
        title: 'Blogs',
        url: '/blogs/news.html',
        enabled: true,
        target: '_self',
        rel: '',
        order: 1
      },
      {
        id: 'privacy',
        title: 'Privacy Policy',
        url: '/pages/privacy-policy.html',
        enabled: true,
        target: '_self',
        rel: '',
        order: 2
      },
      {
        id: 'terms',
        title: 'Terms and Conditions',
        url: '/pages/terms-and-conditions.html',
        enabled: true,
        target: '_self',
        rel: '',
        order: 3
      },
      {
        id: 'faqs',
        title: 'FAQs',
        url: '/pages/faqs.html',
        enabled: true,
        target: '_self',
        rel: '',
        order: 4
      }
    ],
    certifications: [
      { tag: 'ISO 9001', enabled: true },
      { tag: 'GMP', enabled: true },
      { tag: 'FSSAI', enabled: true },
      { tag: 'HACCP', enabled: true },
      { tag: 'NSF', enabled: true }
    ],
    downloads: {
      row1: [
        {
          id: 'handbook',
          title: 'Download Handbook',
          url: '/assets/Customer_Process_and_Policy_Handbook_F.pdf',
          style: 'solid',
          target: '_blank',
          rel: 'noopener',
          download: true,
          enabled: true,
          icon: 'download'
        },
        {
          id: 'brochure',
          title: 'Download Brochure',
          url: '/assets/Medral-Catalogue.pdf',
          style: 'outline',
          target: '_blank',
          rel: 'noopener',
          download: true,
          enabled: true,
          icon: 'file'
        }
      ],
      row2: [
        {
          id: 'jars-catalog',
          title: 'Jars Catalog',
          url: '/assets/JARS_CATALOGUE.pdf',
          style: 'outline',
          target: '_blank',
          rel: 'noopener',
          download: true,
          enabled: true,
          icon: 'grid'
        }
      ]
    },
    legal: [
      {
        id: 'privacy-bottom',
        title: 'Privacy Policy',
        url: '/pages/privacy-policy.html',
        enabled: true,
        target: '_self',
        rel: '',
        order: 1
      },
      {
        id: 'terms-bottom',
        title: 'Terms and Conditions',
        url: '/pages/terms-and-conditions.html',
        enabled: true,
        target: '_self',
        rel: '',
        order: 2
      }
    ]
  }
};
