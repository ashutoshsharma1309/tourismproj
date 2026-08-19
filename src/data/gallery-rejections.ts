/**
 * Photographs the gallery agent collected that do not depict their subject.
 *
 * `scripts/heritage-gallery-agent.mjs` accepts a Commons file on three kinds of
 * evidence: the file sits in a category named for the subject, its title names
 * the subject, or it carries GPS within a few metres of the subject. Two of
 * those three fail in ways the agent cannot see:
 *
 *   NAMED evidence matches on substring. "Soreng" matched Monchaux-Soreng, a
 *   commune in Seine-Maritime, France, and the gallery for a Sikkim town filled
 *   up with a French wind turbine, a French factory and a French church.
 *   "Mangan" matched "Manganese", and a photograph of bacterial deposits on
 *   rocks in Kilbirnie, North Ayrshire was served on /hotels as the illustration
 *   for Mangan district. "Rongli" matched a school gate in Guangzhou.
 *
 *   GEO evidence proves where the camera stood, not what it was pointed at. A
 *   butterfly photographed two metres from the Chungthang coordinate is
 *   evidence of a butterfly.
 *
 * scripts/qa/gallery-integrity.mjs checked licence, authorship, file existence
 * and duplicate use. It never checked that the photograph showed the place, so
 * it passed all of this 11/11.
 *
 * The rule this file enforces is the one the project already applies to
 * panoramas and visiting hours: where the archive cannot show the thing, it
 * shows nothing and says so. `place/soreng` therefore ends with an empty
 * gallery. An empty gallery is a true statement about what has been found; four
 * photographs of Normandy are not.
 *
 * Each entry names the Commons file exactly as `site-galleries.json` records
 * it, so a rejection survives re-running the agent — the file will be collected
 * again, and filtered out again, until the agent's own evidence test improves.
 */

export interface GalleryRejection {
  /** Gallery key, e.g. "place/soreng". */
  galleryKey: string;
  /** Commons file name, exactly as stored in site-galleries.json. */
  file: string;
  /** Why the photograph does not depict the subject. Shown in the QA report. */
  reason: string;
}

export const GALLERY_REJECTIONS: GalleryRejection[] = [
  /* --- Wrong country. "named" evidence, substring collision. ------------- */
  {
    galleryKey: "place/soreng",
    file: "File:Monchaux-Soreng éolienne 1 •K5•419.jpg",
    reason:
      "Depicts a wind turbine at Monchaux-Soreng, Seine-Maritime, France. Matched because the French commune's name contains 'Soreng'. Commons' own caption states the location.",
  },
  {
    galleryKey: "place/soreng",
    file: "File:Monchaux-Soreng 1.jpg",
    reason:
      "Depicts a disused factory at Monchaux-Soreng, Seine-Maritime, France — not Soreng, Sikkim.",
  },
  {
    galleryKey: "place/soreng",
    file: "File:Eglise de Monchaux-Soreng.JPG",
    reason:
      "Depicts the church of Saint-Martin de Monchaux-Soreng, Seine-Maritime, France — a Catholic parish church, not a building in Sikkim.",
  },
  {
    galleryKey: "place/soreng",
    file: "File:Poa bigelovii and Poa occidentalis - PhytoKeys-015-001-g004.jpeg",
    reason:
      "A botanical illustration plate of two North American grass species from a PhytoKeys paper. Depicts no place at all.",
  },
  {
    galleryKey: "place/mangan",
    file: "File:Manganese Bacteria on rocks in Kilbirnie.JPG",
    reason:
      "Depicts manganese bacterial deposits on rocks in the Place Burn, Kilbirnie, North Ayrshire, Scotland. Matched because 'Manganese' contains 'Mangan'. Was being served on /hotels for Mangan district.",
  },
  {
    galleryKey: "place/mangan",
    file: "File:Manganese boulder - Russell Museum.jpg",
    reason:
      "Depicts a manganese boulder outside the Russell Museum in Russell, New Zealand. Same 'Manganese' substring collision.",
  },
  {
    galleryKey: "place/rongli",
    file: "File:Rongli Gate, Guangzhou No.24 Middle School 20230722.jpg",
    reason:
      "Depicts the Rongli Gate of Guangzhou No. 24 Middle School, Guangdong, China. Matched on the shared name 'Rongli'.",
  },

  /* --- Right state, wrong place. A named site 75 km away is not this town. */
  {
    galleryKey: "place/chungthang",
    file: "File:Magical Views From Dzongri Top 4900m (259371765).jpeg",
    reason:
      "Depicts Dzongri Top (4,900 m) in West Sikkim, roughly 75 km from Chungthang and in a different district. Collected on category evidence alone.",
  },
  {
    galleryKey: "place/chungthang",
    file: "File:Magical Views From Dzongri Top 4900m (259371781).jpeg",
    reason:
      "Second frame of the same Dzongri Top series. Same objection.",
  },
  {
    galleryKey: "place/chungthang",
    file: "File:Rise of the plateaus.jpg",
    reason:
      "A generic Himalayan range view whose caption cites a school geography textbook and names no location. Nothing ties it to Chungthang, so it cannot be published as Chungthang.",
  },

  /* --- Depicts a DIFFERENT catalogued subject. ------------------------------
   *
   * A distinct failure from the wrong-country matches above, and a subtler one:
   * these photographs are all genuinely of Sikkim, taken where the archive says
   * they were. The problem is that the thing in the frame has its own record.
   *
   * Ravangla was the case a reader spotted on the home page: the photograph
   * rail showed the great Buddha at Ravangla twice, once captioned "Buddha
   * Park, Ravangla" and once simply "Ravangla", as though they were two places
   * worth visiting. They are one statue. All three photographs filed under the
   * town were of the park, which is catalogued separately 2.6 km away — so the
   * town of Ravangla has, in fact, no photograph of itself, and now says so.
   */
  {
    galleryKey: "place/ravangla",
    file: "File:Buddha statue at Buddha Park of Ravangla, Sikkim, India (1).jpg",
    reason:
      "Depicts the Buddha statue at Buddha Park, which is catalogued separately as place/buddha-park-ravangla. Filed under the town because its filename contains 'Ravangla'.",
  },
  {
    galleryKey: "place/ravangla",
    file: "File:Large Buddha statue inside Buddha Park of Ravangla.jpg",
    reason:
      "Second photograph of the same statue at Buddha Park, not of Ravangla town.",
  },
  {
    galleryKey: "place/ravangla",
    file: "File:Large Gautama Buddha statue in Buddha Park of Ravangla, Sikkim.jpg",
    reason:
      "Third photograph of the same statue at Buddha Park. With these removed the town has no photograph, which is the true state of the archive.",
  },
  {
    galleryKey: "monastery/sanga-choeling",
    file: "File:Rabdentse ruins.jpg",
    reason:
      "Depicts the Rabdentse ruins — the old royal capital, catalogued separately as place/rabdentse — not Sanga Choeling Monastery. Commons' own caption places it 'close to Pelling'.",
  },
  {
    galleryKey: "place/yumthang-valley",
    file: "File:Kangchenjunga - Early Morning View.jpg",
    reason:
      "Depicts Kangchenjunga from south of the Dongkya Range, per the photographer's own caption. Kangchenjunga has its own record; this is not a photograph of Yumthang Valley.",
  },
  {
    galleryKey: "place/namgyal-institute-of-tibetology",
    file: "File:Urban settlements beside Crown Prince Tenzing Kunzang Namgyal Walkway in Gangtok.jpg",
    reason:
      "A townscape of Gangtok shot from the ropeway. It shares the word 'Namgyal' with the Institute and nothing else — the Institute is not in the frame.",
  },
];

const REJECTED_BY_GALLERY = new Map<string, Set<string>>();
for (const rejection of GALLERY_REJECTIONS) {
  const set = REJECTED_BY_GALLERY.get(rejection.galleryKey) ?? new Set<string>();
  set.add(rejection.file);
  REJECTED_BY_GALLERY.set(rejection.galleryKey, set);
}

/** Whether this photograph has been rejected for this gallery. */
export function isRejected(galleryKey: string, file: string): boolean {
  return REJECTED_BY_GALLERY.get(galleryKey)?.has(file) ?? false;
}

/** How many photographs the rejection list removes — reported on /preservation. */
export const GALLERY_REJECTION_COUNT = GALLERY_REJECTIONS.length;
