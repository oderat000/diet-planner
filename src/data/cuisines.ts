/**
 * Cuisine reference, keyed by TheMealDB's `area` field.
 *
 * Per the project rule, none of this is model-invented: each entry is a factual
 * summary of the cuisine drawn from its Wikipedia article, carrying the source link
 * so any reader can verify it. It describes the *cuisine* a dish belongs to — not
 * the individual dish, which no free database characterizes.
 *
 * Cuisines not listed here degrade to origin-only in the UI: we show where the dish
 * is from and say nothing we can't source, rather than guess a description.
 */

export interface Cuisine {
  /** what the cuisine is */
  definition: string;
  /** its characteristic taste profile, one short phrase */
  taste: string;
  /** the Wikipedia article the summary is drawn from */
  source: string;
}

/** Keys must match TheMealDB's `strArea` values exactly. */
export const CUISINES: Record<string, Cuisine> = {
  American: {
    definition:
      "A cuisine of broad regional variety shaped by waves of immigration, blending Indigenous, European and African traditions with an emphasis on beef, corn, wheat and convenience cooking.",
    taste: "Hearty, rich and savory, often sweet.",
    source: "https://en.wikipedia.org/wiki/American_cuisine",
  },
  British: {
    definition:
      "The cooking traditions of the United Kingdom, historically built on roasted and boiled meats, root vegetables and baking, and later transformed by ingredients from across the former empire.",
    taste: "Mild, savory and comforting.",
    source: "https://en.wikipedia.org/wiki/British_cuisine",
  },
  Canadian: {
    definition:
      "A cuisine drawing on Indigenous foodways and French and British settler cooking, varying widely by region and making heavy use of local produce, game, maple and seafood.",
    taste: "Hearty and savory, with sweet maple notes.",
    source: "https://en.wikipedia.org/wiki/Canadian_cuisine",
  },
  Chinese: {
    definition:
      "One of the world's oldest culinary traditions, spanning distinct regional styles and built on rice, wheat, soy, and the balancing of flavors, aromas and textures.",
    taste: "Savory and umami-rich, balancing sweet, sour and salty.",
    source: "https://en.wikipedia.org/wiki/Chinese_cuisine",
  },
  Croatian: {
    definition:
      "A cuisine split between Mediterranean coastal cooking of seafood, olive oil and herbs, and heartier inland fare of meats, stews and freshwater fish influenced by its neighbours.",
    taste: "Savory and herbaceous, coast to inland.",
    source: "https://en.wikipedia.org/wiki/Croatian_cuisine",
  },
  Dutch: {
    definition:
      "The traditionally simple, hearty cooking of the Netherlands, rooted in dairy, bread, potatoes and vegetables, with a strong tradition of baked goods and pastries.",
    taste: "Mild, hearty and lightly sweet.",
    source: "https://en.wikipedia.org/wiki/Dutch_cuisine",
  },
  Egyptian: {
    definition:
      "A cuisine of the Nile valley making heavy use of legumes, vegetables and bread, with staple dishes built on fava beans, lentils, rice and flatbread.",
    taste: "Earthy, savory and lightly spiced.",
    source: "https://en.wikipedia.org/wiki/Egyptian_cuisine",
  },
  Filipino: {
    definition:
      "The cooking of the Philippine islands, blending Austronesian, Malay, Spanish, Chinese and American influences around rice, seafood and pork.",
    taste: "Sweet, sour and savory in balance.",
    source: "https://en.wikipedia.org/wiki/Filipino_cuisine",
  },
  French: {
    definition:
      "A cuisine of refined technique and regional depth, foundational to Western cooking, built on butter, wine, herbs, cheese and careful preparation of quality ingredients.",
    taste: "Rich, buttery and refined.",
    source: "https://en.wikipedia.org/wiki/French_cuisine",
  },
  Greek: {
    definition:
      "A Mediterranean cuisine centred on olive oil, vegetables, grains, fish and lamb, seasoned with lemon, oregano and herbs, and using cheeses and yogurt widely.",
    taste: "Bright, tangy and herbaceous.",
    source: "https://en.wikipedia.org/wiki/Greek_cuisine",
  },
  Indian: {
    definition:
      "A group of regional cuisines across the Indian subcontinent, distinguished by sophisticated use of spices, herbs and a wide range of vegetarian and meat dishes built on rice and flatbreads.",
    taste: "Deeply spiced, aromatic and complex.",
    source: "https://en.wikipedia.org/wiki/Indian_cuisine",
  },
  Irish: {
    definition:
      "A cuisine historically based on the potato, dairy and meats such as pork and lamb, with hearty stews, breads and preserved foods suited to a cool, damp climate.",
    taste: "Mild, hearty and comforting.",
    source: "https://en.wikipedia.org/wiki/Irish_cuisine",
  },
  Italian: {
    definition:
      "A Mediterranean cuisine developed since Roman times, emphasizing fresh, quality ingredients over complex preparation, and built on olive oil, pasta, tomatoes, cheese and regional produce.",
    taste: "Fresh, savory and regionally diverse.",
    source: "https://en.wikipedia.org/wiki/Italian_cuisine",
  },
  Jamaican: {
    definition:
      "A cuisine mixing Indigenous, African, European, Indian and Chinese influences, known for bold seasoning, jerk spicing and tropical produce.",
    taste: "Bold, spicy and aromatic.",
    source: "https://en.wikipedia.org/wiki/Jamaican_cuisine",
  },
  Japanese: {
    definition:
      "A cuisine built on rice, seasonal produce, seafood and soy, prizing freshness, presentation and the natural flavor of ingredients, with dashi as a foundational stock.",
    taste: "Delicate, clean and umami-forward.",
    source: "https://en.wikipedia.org/wiki/Japanese_cuisine",
  },
  Kenyan: {
    definition:
      "An East African cuisine varying by region and community, built on staples of maize, beans, rice and vegetables, often served with stewed meats and greens.",
    taste: "Earthy, savory and mildly spiced.",
    source: "https://en.wikipedia.org/wiki/Kenyan_cuisine",
  },
  Malaysian: {
    definition:
      "A cuisine reflecting Malay, Chinese and Indian communities, rich in aromatics, chilli, coconut and fresh herbs, built around rice and noodles.",
    taste: "Spicy, aromatic and coconut-rich.",
    source: "https://en.wikipedia.org/wiki/Malaysian_cuisine",
  },
  Mexican: {
    definition:
      "A cuisine rooted in Mesoamerican traditions of corn, beans, chillies and tomatoes, fused with Spanish influences, recognised by UNESCO as intangible cultural heritage.",
    taste: "Bold, spicy and tangy.",
    source: "https://en.wikipedia.org/wiki/Mexican_cuisine",
  },
  Moroccan: {
    definition:
      "A North African cuisine blending Berber, Arab and Mediterranean influences, known for slow-cooked tagines, couscous and warm spice blends such as ras el hanout.",
    taste: "Warmly spiced, sweet and savory.",
    source: "https://en.wikipedia.org/wiki/Moroccan_cuisine",
  },
  Polish: {
    definition:
      "A hearty Central European cuisine of meats, dumplings, cabbage, mushrooms and soured flavors, shaped by a cool climate and its neighbours' traditions.",
    taste: "Hearty, savory and lightly sour.",
    source: "https://en.wikipedia.org/wiki/Polish_cuisine",
  },
  Portuguese: {
    definition:
      "A cuisine built on seafood, especially salt cod, alongside pork, olive oil, bread and abundant use of herbs and spices from its long maritime history.",
    taste: "Savory, briny and gently spiced.",
    source: "https://en.wikipedia.org/wiki/Portuguese_cuisine",
  },
  Russian: {
    definition:
      "A cuisine of a cold climate, rich in breads, grains, root vegetables, soured and preserved foods, and hearty soups and stews.",
    taste: "Hearty, savory and sour.",
    source: "https://en.wikipedia.org/wiki/Russian_cuisine",
  },
  Spanish: {
    definition:
      "A Mediterranean cuisine of strong regional variety, built on olive oil, garlic, seafood, cured pork and vegetables, and known for shared small dishes.",
    taste: "Savory, garlicky and olive-rich.",
    source: "https://en.wikipedia.org/wiki/Spanish_cuisine",
  },
  Thai: {
    definition:
      "The national cuisine of Thailand, emphasizing lightly prepared dishes with aromatics and spicy heat, using herbs, fish sauce, chilli, coconut milk and lime.",
    taste: "Balanced, spicy-and-sour, aromatic.",
    source: "https://en.wikipedia.org/wiki/Thai_cuisine",
  },
  Tunisian: {
    definition:
      "A North African cuisine known for its fiery harissa chilli paste, olive oil, seafood and couscous, blending Berber, Mediterranean and Arab traditions.",
    taste: "Fiery, spicy and savory.",
    source: "https://en.wikipedia.org/wiki/Tunisian_cuisine",
  },
  Turkish: {
    definition:
      "A cuisine at the crossroads of the Mediterranean, Balkans and Middle East, rich in grilled meats, vegetables, legumes, yogurt and pastries.",
    taste: "Savory, herby and richly varied.",
    source: "https://en.wikipedia.org/wiki/Turkish_cuisine",
  },
  Ukrainian: {
    definition:
      "A cuisine of fertile farmland, built on grains, vegetables, mushrooms and meats, known for beetroot borscht, dumplings and soured and preserved foods.",
    taste: "Hearty, savory and lightly sour.",
    source: "https://en.wikipedia.org/wiki/Ukrainian_cuisine",
  },
  Vietnamese: {
    definition:
      "A cuisine prizing fresh herbs, rice, and a balance of flavors and textures, using fish sauce, lime and chilli with light, aromatic broths and salads.",
    taste: "Fresh, light and aromatic.",
    source: "https://en.wikipedia.org/wiki/Vietnamese_cuisine",
  },
  Argentine: {
    definition:
      "A South American cuisine blending Indigenous and Spanish colonial roots with heavy 19th–20th century Italian and Spanish immigration, built on beef, empanadas, pasta and yerba mate.",
    taste: "Hearty, beef-forward and herbaceous.",
    source: "https://en.wikipedia.org/wiki/Argentine_cuisine",
  },
  Venezuelan: {
    definition:
      "A cuisine drawing on Indigenous, West African and European traditions, built on corn, rice, plantains, beans and meats, with ají dulce and papelón recurring throughout.",
    taste: "Savory, hearty and regionally diverse.",
    source: "https://en.wikipedia.org/wiki/Venezuelan_cuisine",
  },
  "Saudi Arabian": {
    definition:
      "A Gulf Arab cuisine built on lamb, chicken, rice and legumes with olive oil and warm spices such as cumin, cinnamon and saffron, part of the wider Arab culinary tradition.",
    taste: "Aromatic, warming and layered with spice.",
    source: "https://en.wikipedia.org/wiki/Arab_cuisine",
  },
};

/**
 * TheMealDB's `area` field is inconsistent: classic entries use demonyms ("Dutch"),
 * newer community ones use country names ("Netherlands"). Map the variants we've seen
 * onto our canonical keys so a dish isn't shown origin-only when we do hold its profile.
 */
const ALIASES: Record<string, string> = {
  netherlands: "Dutch",
  holland: "Dutch",
  france: "French",
  spain: "Spanish",
  italy: "Italian",
  greece: "Greek",
  turkey: "Turkish",
  china: "Chinese",
  japan: "Japanese",
  india: "Indian",
  thailand: "Thai",
  vietnam: "Vietnamese",
  mexico: "Mexican",
  morocco: "Moroccan",
  tunisia: "Tunisian",
  egypt: "Egyptian",
  poland: "Polish",
  portugal: "Portuguese",
  russia: "Russian",
  ukraine: "Ukrainian",
  croatia: "Croatian",
  ireland: "Irish",
  jamaica: "Jamaican",
  kenya: "Kenyan",
  malaysia: "Malaysian",
  canada: "Canadian",
  argentina: "Argentine",
  venezuela: "Venezuelan",
  "saudi arabia": "Saudi Arabian",
  emirati: "Saudi Arabian",
  uae: "Saudi Arabian",
  "united states": "American",
  usa: "American",
  "united kingdom": "British",
  uk: "British",
  england: "British",
};

/** Cuisines offered as "favourites" in the create form — the ones we can profile. */
export const SELECTABLE_CUISINES: string[] = Object.keys(CUISINES).sort();

/** Map any area spelling to our canonical cuisine key, or null if we don't cover it. */
export function canonicalCuisine(area: string | undefined | null): string | null {
  if (!area) return null;
  if (CUISINES[area]) return area;
  return ALIASES[area.trim().toLowerCase()] ?? null;
}

export function cuisineFor(area: string | undefined | null): Cuisine | null {
  const key = canonicalCuisine(area);
  return key ? CUISINES[key] : null;
}
