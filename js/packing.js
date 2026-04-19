const BASE = [
  "Passport / ID card",
  "Wallet — cash + cards",
  "Phone + charger",
  "Power bank",
  "Travel adapter (international only)",
  "Earphones / headphones",
  "Sunglasses",
  "Hat / cap",
  "Toothbrush + toothpaste",
  "Deodorant",
  "Shampoo + body wash (travel size)",
  "Skincare",
  "Personal medication",
  "Tissues / wet wipes",
  "Hand sanitizer",
  "Reusable water bottle",
  "Small daypack",
  "Snacks for the road"
];

const BY_TYPE = {
  beach: [
    "Swimwear (x2)",
    "Sunscreen SPF 50+",
    "Flip-flops / sandals",
    "Beach towel",
    "Rash guard (for snorkel)",
    "Dry bag for phone",
    "After-sun lotion",
    "Light shirts + shorts",
    "Waterproof phone pouch"
  ],
  mountain: [
    "Hiking shoes / trail runners",
    "Windbreaker / rain jacket",
    "Warm layer (fleece)",
    "Gloves + beanie (altitude)",
    "Trekking poles (optional)",
    "Long socks",
    "Insect repellent",
    "Headlamp / torch",
    "Blister plasters"
  ],
  city: [
    "Comfortable walking shoes",
    "Compact umbrella",
    "Outfit for nice dinner",
    "Smart-casual shirt",
    "Museum / attraction tickets printouts",
    "City map or offline Google Maps area"
  ],
  food: [
    "Stretchy pants 😄",
    "Stomach medicine (just in case)",
    "Wet wipes for street food",
    "Reusable cutlery set",
    "Restaurant reservation screenshots",
    "Camera / phone with good lens"
  ],
  mixed: [
    "Walking shoes",
    "Swimwear",
    "Light jacket",
    "Compact umbrella",
    "One nice outfit"
  ]
};

const INTERNATIONAL = [
  "Passport — check 6-month validity",
  "Visa (printed + copy)",
  "Travel insurance printout",
  "Foreign currency / forex card",
  "Plug adapter",
  "International roaming / eSIM",
  "COVID/vaccination card (if required)"
];

const LONG_TRIP = [
  "Laundry pods / travel detergent",
  "Extra underwear + socks",
  "Second pair of shoes",
  "Small first-aid kit"
];

export function generatePackingList(trip) {
  const items = new Set(BASE);
  (BY_TYPE[trip.tripType] || []).forEach(i => items.add(i));
  if (trip.anchors?.flight?.data?.international) {
    INTERNATIONAL.forEach(i => items.add(i));
  }
  if ((Number(trip.days) || 0) >= 5) {
    LONG_TRIP.forEach(i => items.add(i));
  }
  return [...items];
}
