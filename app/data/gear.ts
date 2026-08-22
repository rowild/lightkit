/**
 * Camera and aircraft models known to support at least one physical ND
 * solution. Ported from the researched seed in
 * _MATERIAL/common-nd-gear-seed.json, checked 2026-08-16, plus six handheld
 * gimbal and action cameras researched separately on 2026-08-17.
 *
 * See AGENTS.md, "ND tool product rules". In short: listing a model claims only
 * that an ND solution exists for it. Nothing here may reach a calculation, and
 * `knownStops` may only decide which rows of the outcomes table start expanded.
 */

export interface GearEntry {
  /** Stable kebab-case id. Persisted, so never rename one in place. */
  id: string
  brand: string
  model: string
  category: 'drone' | 'mirrorless' | 'dslr' | 'compact' | 'cinema'
  ndSupport: 'external' | 'internal' | 'both'
  /**
   * Strengths a maker is known to sell for this model.
   *
   * Presentation only: it decides which rows of the outcomes table start
   * expanded. It must never enter a calculation, and every other strength stays
   * one tap away. Empty for interchangeable-lens bodies, which have no fixed
   * set.
   */
  knownStops: number[]
  sources: string[]
  /** ISO date, so a stale entry is obvious. */
  checkedAt: string
}

export interface UnverifiedGear {
  brand: string
  model: string
  /** Why it is not listed, in one plain sentence. */
  reason: string
  source?: string
}

/** Sentinel id for "no gear selected". */
export const ANY_GEAR_ID = 'any'

export const gearEntries: GearEntry[] = [
  // --- common[] (drones) ---------------------------------------------------
  // Every drone kit in the seed is a physical solid-ND accessory (solid_nd or
  // multi_camera_solid_nd); none records an internal ND system, so every
  // aircraft below gets ndSupport: 'external'.
  {
    id: 'dji-mini-5-pro',
    brand: 'DJI',
    model: 'Mini 5 Pro',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 5, 7],
    sources: ['https://store.dji.com/no/product/dji-mini-5-pro-nd-filter-set-8-32-128'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-mini-4-pro',
    brand: 'DJI',
    model: 'Mini 4 Pro',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [4, 6, 8],
    sources: ['https://store.dji.com/product/dji-mini-4-pro-nd-filters-set-16-256?vid=148761'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-mini-3-pro',
    brand: 'DJI',
    model: 'Mini 3 Pro',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [4, 6, 8],
    sources: ['https://store.dji.com/de/product/dji-mini-3-pro-nd-filters-set-16-256?vid=114291'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-mini-3',
    brand: 'DJI',
    model: 'Mini 3',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [4, 6, 8],
    sources: ['https://store.dji.com/de/product/dji-mini-3-pro-nd-filters-set-16-256?vid=114291'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-flip',
    brand: 'DJI',
    model: 'Flip',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [4, 6, 8],
    sources: ['https://www.djiusa.com/products/dji-flip-vlog-combo'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-air-3s',
    brand: 'DJI',
    model: 'Air 3S',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 5, 7],
    sources: ['https://www.dji.com/air-3s'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-air-3',
    brand: 'DJI',
    model: 'Air 3',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5, 6],
    sources: ['https://store.dji.com/ca/product/dji-air-3-nd-filters-set-8-64'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-air-2s',
    brand: 'DJI',
    model: 'Air 2S',
    category: 'drone',
    ndSupport: 'external',
    // Two kits (ND4/8/16/32 and ND64/128/256/512): union of both stops arrays.
    knownStops: [2, 3, 4, 5, 6, 7, 8, 9],
    sources: [
      'https://store.dji.com/product/dji-air-2s-nd-filters-set-8-32?vid=104061',
      'https://store.dji.com/si/product/dji-air-2s-nd-filters-set-64-512'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-mavic-4-pro',
    brand: 'DJI',
    model: 'Mavic 4 Pro',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5, 6],
    sources: ['https://store.dji.com/pr/product/dji-mavic-4-pro-nd-filters-set'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-mavic-3-pro',
    brand: 'DJI',
    model: 'Mavic 3 Pro',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5, 6],
    sources: ['https://store.dji.com/product/dji-mavic-3-pro-nd-filters-set'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-mavic-3-pro-cine',
    brand: 'DJI',
    model: 'Mavic 3 Pro Cine',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5, 6],
    sources: ['https://store.dji.com/product/dji-mavic-3-pro-nd-filters-set'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-mavic-3-classic',
    brand: 'DJI',
    model: 'Mavic 3 Classic',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5, 6],
    sources: ['https://store.dji.com/nl/product/dji-mavic-3-classic-nd-filters-set-8-64'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-avata-2',
    brand: 'DJI',
    model: 'Avata 2',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5],
    sources: ['https://store.dji.com/product/dji-avata-2-nd-filters-set-8-32'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'dji-avata',
    brand: 'DJI',
    model: 'Avata',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5],
    sources: ['https://store.dji.com/ro/product/dji-avata-nd-filters-set-8-32'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'hoverair-x1-pro',
    brand: 'HOVERAir',
    model: 'X1 PRO',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5, 6],
    sources: ['https://us.hoverair.com/products/nd-filters-for-x1-pro-and-promax'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'hoverair-x1-promax',
    brand: 'HOVERAir',
    model: 'X1 PROMAX',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5, 6],
    sources: ['https://us.hoverair.com/products/nd-filters-for-x1-pro-and-promax'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'skyrover-x1',
    brand: 'SKYROVER',
    model: 'X1',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [4, 6, 8],
    sources: ['https://www.skyroverdrone.com/collections/accessories'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'autel-robotics-evo-lite-plus',
    brand: 'Autel Robotics',
    model: 'EVO Lite+',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [2, 3, 4, 5],
    sources: [
      'https://shop.autelrobotics.com/products/drones-accessories-evo-lite-nd-neural-density-filters-1'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'skydio-2',
    brand: 'Skydio',
    model: '2',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5],
    sources: ['https://shop.skydio.com/products/skydio-filters'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'skydio-2-plus',
    brand: 'Skydio',
    model: '2+',
    category: 'drone',
    ndSupport: 'external',
    knownStops: [3, 4, 5],
    sources: ['https://shop.skydio.com/products/skydio-filters'],
    checkedAt: '2026-08-16'
  },

  // --- cameraCommon[] (interchangeable-lens and fixed-lens bodies) ---------
  // knownStops is always [] here: an interchangeable-lens body has no fixed
  // filter set (product rule 2 — the app does not model the attachment).
  // Sources are evidenceIds resolved against the seed's evidenceSources map.
  //
  // The seed's category for fixed-lens bodies (Fujifilm X100VI, Leica Q3,
  // Ricoh GR III / GR IIIx) is 'fixed-lens', which is not one of this app's
  // five category values. 'compact' is the one value in that union the seed
  // never emits on its own, so it maps 'fixed-lens' -> 'compact' — a label
  // translation, not an invented fact; every other field is unchanged.
  {
    id: 'sony-alpha-7-iii',
    brand: 'Sony',
    model: 'Alpha 7 III',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://electronics.sony.com/imaging/interchangeable-lens-cameras/c/full-frame',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'sony-alpha-7-iv',
    brand: 'Sony',
    model: 'Alpha 7 IV',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://electronics.sony.com/imaging/interchangeable-lens-cameras/c/full-frame',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'sony-alpha-7r-v',
    brand: 'Sony',
    model: 'Alpha 7R V',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://electronics.sony.com/imaging/interchangeable-lens-cameras/c/full-frame',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'sony-alpha-7s-iii',
    brand: 'Sony',
    model: 'Alpha 7S III',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://electronics.sony.com/imaging/interchangeable-lens-cameras/c/full-frame',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'sony-fx3',
    brand: 'Sony',
    model: 'FX3',
    category: 'cinema',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://electronics.sony.com/imaging/cinema-line-cameras/c/all-cinema-line-cameras',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'sony-fx30',
    brand: 'Sony',
    model: 'FX30',
    category: 'cinema',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://electronics.sony.com/imaging/cinema-line-cameras/c/all-cinema-line-cameras',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'sony-fx6',
    brand: 'Sony',
    model: 'FX6',
    category: 'cinema',
    ndSupport: 'internal',
    knownStops: [],
    sources: [
      'https://electronics.sony.com/imaging/cinema-line-cameras/c/all-cinema-line-cameras',
      'https://electronics.sony.com/imaging/interchangeable-lens-cameras/all-interchangeable-lens-cameras/p/ilmefx6vk'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'canon-eos-r5',
    brand: 'Canon',
    model: 'EOS R5',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.usa.canon.com/digital-cameras/eos-r-system',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'canon-eos-r5-mark-ii',
    brand: 'Canon',
    model: 'EOS R5 Mark II',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.usa.canon.com/digital-cameras/eos-r-system',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'canon-eos-r6-mark-ii',
    brand: 'Canon',
    model: 'EOS R6 Mark II',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.usa.canon.com/digital-cameras/eos-r-system',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'canon-eos-r7',
    brand: 'Canon',
    model: 'EOS R7',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.usa.canon.com/digital-cameras/eos-r-system',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'canon-eos-r5-c',
    brand: 'Canon',
    model: 'EOS R5 C',
    category: 'cinema',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.usa.canon.com/digital-cameras/eos-r-system',
      'https://www.usa.canon.com/learning/training-articles/training-articles-list/the-best-settings-for-capturing-wildlife-on-the-canon-eos-r5-c-camera',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'nikon-z8',
    brand: 'Nikon',
    model: 'Z8',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.nikonusa.com/c/cameras/mirrorless-cameras/overview',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'nikon-z9',
    brand: 'Nikon',
    model: 'Z9',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.nikonusa.com/c/cameras/mirrorless-cameras/overview',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'nikon-z6-iii',
    brand: 'Nikon',
    model: 'Z6 III',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.nikonusa.com/c/cameras/mirrorless-cameras/overview',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'nikon-d850',
    brand: 'Nikon',
    model: 'D850',
    category: 'dslr',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.nikonusa.com/p/d850/1585/overview',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'fujifilm-x-t5',
    brand: 'Fujifilm',
    model: 'X-T5',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.fujifilm-x.com/en-us/products/compare-cameras/',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'fujifilm-x-h2s',
    brand: 'Fujifilm',
    model: 'X-H2S',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.fujifilm-x.com/en-us/products/compare-cameras/',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'fujifilm-x-h2',
    brand: 'Fujifilm',
    model: 'X-H2',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.fujifilm-x.com/en-us/products/compare-cameras/',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'fujifilm-x-s20',
    brand: 'Fujifilm',
    model: 'X-S20',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.fujifilm-x.com/en-us/products/compare-cameras/',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'fujifilm-x100vi',
    brand: 'Fujifilm',
    model: 'X100VI',
    category: 'compact', // seed category: 'fixed-lens' — see note above
    ndSupport: 'internal',
    knownStops: [],
    sources: ['https://www.fujifilm-x.com/global/products/cameras/x100vi/specifications/'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'panasonic-lumix-s5ii',
    brand: 'Panasonic',
    model: 'Lumix S5II',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.panasonic.com/content/dam/Panasonic/ph/en/product-catalogue-download/pdf/FY2025-SUMMER-CATALOGUE-WEBSITE-1.pdf',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'panasonic-lumix-s5iix',
    brand: 'Panasonic',
    model: 'Lumix S5IIX',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.panasonic.com/content/dam/Panasonic/ph/en/product-catalogue-download/pdf/FY2025-SUMMER-CATALOGUE-WEBSITE-1.pdf',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'panasonic-lumix-gh6',
    brand: 'Panasonic',
    model: 'Lumix GH6',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.panasonic.com/content/dam/Panasonic/ph/en/product-catalogue-download/pdf/FY2025-SUMMER-CATALOGUE-WEBSITE-1.pdf',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'om-system-om-1-mark-ii',
    brand: 'OM System',
    model: 'OM-1 Mark II',
    category: 'mirrorless',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://explore.omsystem.com/c/en/om-1-mark-ii',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'leica-q3',
    brand: 'Leica',
    model: 'Q3',
    category: 'compact', // seed category: 'fixed-lens' — see note above
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://leica-camera.com/sites/default/files/pm-95469-EN_technical_data_Leica_Q3_1.pdf',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'ricoh-gr-iii',
    brand: 'Ricoh',
    model: 'GR III',
    category: 'compact', // seed category: 'fixed-lens' — see note above
    ndSupport: 'internal',
    knownStops: [],
    sources: ['https://www.ricoh-imaging.co.jp/english/products/gr-3/spec/index.html'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'ricoh-gr-iiix',
    brand: 'Ricoh',
    model: 'GR IIIx',
    category: 'compact', // seed category: 'fixed-lens' — see note above
    ndSupport: 'internal',
    knownStops: [],
    sources: ['https://www.ricoh-imaging.co.jp/english/products/gr-3/spec/index.html'],
    checkedAt: '2026-08-16'
  },
  {
    id: 'blackmagic-design-pocket-cinema-camera-4k',
    brand: 'Blackmagic Design',
    model: 'Pocket Cinema Camera 4K',
    category: 'cinema',
    ndSupport: 'external',
    knownStops: [],
    sources: [
      'https://www.blackmagicdesign.com/products/blackmagicpocketcinemacamera/techspecs/W-CIN-16',
      'https://nisiopticsusa.com/shop/nisi-circular-filters/round-nd-filters/circular-nd1000-3-0-10-stop/'
    ],
    checkedAt: '2026-08-16'
  },
  {
    id: 'blackmagic-design-pocket-cinema-camera-6k-pro',
    brand: 'Blackmagic Design',
    model: 'Pocket Cinema Camera 6K Pro',
    category: 'cinema',
    ndSupport: 'internal',
    knownStops: [],
    sources: ['https://www.blackmagicdesign.com/products/blackmagicpocketcinemacamera/techspecs/W-CIN-16'],
    checkedAt: '2026-08-16'
  },

  // --- handheld gimbal and action cameras, added 2026-08-17 ---------------
  // Not from the seed. Researched on request, each against a current filter
  // product page, as product rule 2 requires.
  //
  // `category` is 'compact' for the same reason the fixed-lens bodies above
  // are: these are fixed-lens cameras, and 'compact' is the closest of the five
  // values in the union. Nothing in the app reads the field; it is a label.
  //
  // Every set here is magnetic or snap-on, so `ndSupport` is 'external'
  // throughout. `knownStops` is the maker's own kit wherever one exists.
  {
    id: 'dji-osmo-pocket-3',
    brand: 'DJI',
    model: 'Osmo Pocket 3',
    category: 'compact',
    ndSupport: 'external',
    // DJI Osmo Pocket 3 Magnetic ND Filter Set: ND16, ND64, ND256.
    knownStops: [4, 6, 8],
    sources: ['https://store.dji.com/product/osmo-pocket-3-magnetic-nd-filters-set'],
    checkedAt: '2026-08-17'
  },
  {
    id: 'dji-osmo-pocket-4',
    brand: 'DJI',
    model: 'Osmo Pocket 4',
    category: 'compact',
    ndSupport: 'external',
    // The same DJI set. Its compatibility list names the Pocket 4 beside the
    // Pocket 3, so this is one product covering two bodies, not an inference
    // drawn from the model number.
    knownStops: [4, 6, 8],
    sources: ['https://store.dji.com/product/osmo-pocket-3-magnetic-nd-filters-set'],
    checkedAt: '2026-08-17'
  },
  {
    id: 'dji-osmo-pocket-4p',
    brand: 'DJI',
    model: 'Osmo Pocket 4P',
    category: 'compact',
    ndSupport: 'external',
    // No first-party set covers the 4P - DJI's magnetic set names only the
    // Pocket 3 and 4. Freewell's Standard Day kit (ND8/16/32/64) is a
    // model-specific accessory from a vendor this file already trusts, which is
    // what product rule 2 allows.
    knownStops: [3, 4, 5, 6],
    sources: ['https://freewellgear.com/products/dji-pocket-4p-standard'],
    checkedAt: '2026-08-17'
  },
  {
    id: 'dji-osmo-action-5-pro',
    brand: 'DJI',
    model: 'Osmo Action 5 Pro',
    category: 'compact',
    ndSupport: 'external',
    // DJI Osmo Action ND Filter Set: ND8, ND16, ND32. One product, listed for
    // the Action 3, Action 4 and Action 5 Pro together.
    knownStops: [3, 4, 5],
    sources: ['https://store.dji.com/product/osmo-action-nd-filter-kit-new'],
    checkedAt: '2026-08-17'
  },
  {
    id: 'dji-osmo-action-6',
    brand: 'DJI',
    model: 'Osmo Action 6',
    category: 'compact',
    ndSupport: 'external',
    // The Action 6 has a set of its own, not the one above, at the same three
    // strengths: ND8, ND16, ND32.
    knownStops: [3, 4, 5],
    sources: ['https://store.dji.com/nl/product/osmo-action-6-nd-filter-set'],
    checkedAt: '2026-08-17'
  },
  {
    id: 'insta360-luna-ultra',
    brand: 'Insta360',
    model: 'Luna Ultra',
    category: 'compact',
    ndSupport: 'external',
    // Insta360's own ND Filter Set: ND4, ND16, ND64.
    knownStops: [2, 4, 6],
    sources: ['https://store.insta360.com/product/luna-ultra-nd-filter-set'],
    checkedAt: '2026-08-17'
  }
]

export const unverifiedGear: UnverifiedGear[] = [
  // --- articleCandidates[] with disposition other than 'common' -----------
  // (disposition: 'common' candidates — SKYROVER X1, HOVERAir X1 PRO/PROMAX,
  // Autel Robotics EVO Lite+ — are already in gearEntries above.)
  {
    brand: 'Potensic',
    model: 'ATOM 2',
    reason:
      'The first-party VND page says 1–5 stops but publishes a transmission range that does not match ND2–ND32; ask the vendor to clarify before treating the values as exact.',
    source: 'https://store.potensic.com/products/atom-2-vnd-filter'
  },
  {
    brand: 'DroneBlocks / Bitcraze',
    model: 'Crazyflie Nano',
    reason: 'Educational platform, not a camera drone for this ND workflow.'
  },
  {
    brand: 'Autel Robotics',
    model: 'EVO Nano+',
    reason:
      "The aircraft is relevant, but no current first-party exact ND set was found in Autel's accessory collection."
  },
  {
    brand: 'Antigravity',
    model: 'A1',
    reason:
      'Dual 360-degree lenses require matched filters and stitching-safe verification; no official ND accessory was confirmed.'
  },
  {
    brand: 'Freefly',
    model: 'Astro / Astro Prime',
    reason: 'Filter compatibility belongs to the installed camera and lens payload, not the airframe.'
  },
  {
    brand: 'Parrot',
    model: 'ANAFI USA / USA GOV',
    reason: 'No current exact, model-specific ND kit was confirmed from Parrot.'
  },
  {
    brand: 'Parrot',
    model: 'ANAFI Ai',
    reason:
      'No exact kit was confirmed; the reference article also incorrectly calls this 898 g aircraft sub-250 g.'
  },
  {
    brand: 'Skyfish',
    model: 'Osprey',
    reason: 'Carries interchangeable Sony-class payloads; key by camera, lens, and filter interface.'
  },
  {
    brand: 'EagleNXT',
    model: 'eBee TAC / eBee VISION',
    reason: 'Survey/ISR payload workflow is not equivalent to a consumer video ND preset.'
  },
  {
    brand: 'Wingtra',
    model: 'WingtraRAY',
    reason: 'Key by mapping payload and approved optical accessory, not airframe name.'
  },
  {
    brand: 'ACSL',
    model: 'SOTEN',
    reason: 'Hot-swappable camera modules require module-specific compatibility.'
  },
  {
    brand: 'Anzu Robotics',
    model: 'Raptor T',
    reason:
      'RGB/thermal payload needs a verified optical-path-specific accessory; article reports the aircraft unavailable at the check time.'
  },

  // --- DJI handheld cameras: not in the seed at all (brief, Step 4) -------
  // The Osmo Pocket 3 and the Osmo Action 5 Pro sat here as "not researched
  // yet" until 2026-08-17. Both were then checked against a current filter set
  // and moved into gearEntries above.
  {
    brand: 'DJI',
    model: 'Osmo 360',
    reason:
      'Not researched yet. Two lenses means a filter set is a pair, which this list cannot express.'
  }
]

/** Look up an entry. Returns undefined for ANY_GEAR_ID and unknown ids. */
export const findGear = (id: string): GearEntry | undefined =>
  gearEntries.find(gear => gear.id === id)

export interface GearGroup {
  brand: string
  models: GearEntry[]
}

/** Group entries by brand for an <optgroup> list, brands A to Z. */
export const gearGroups = (): GearGroup[] => {
  const byBrand = new Map<string, GearEntry[]>()

  for (const gear of gearEntries) {
    const models = byBrand.get(gear.brand)
    if (models) models.push(gear)
    else byBrand.set(gear.brand, [gear])
  }

  return [...byBrand.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([brand, models]) => ({ brand, models }))
}
