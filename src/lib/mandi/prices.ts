export interface MandiPriceData {
  commodity: string;
  commodityHi: string;
  variety: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  date: string;
  source: string;
}

export interface MandiPriceResponse {
  success: boolean;
  data: MandiPriceData[];
  lastUpdated: string;
  source: string;
  error?: string;
}

const NEEMUCH_MANDI_URL = 'https://neemuchmandibhav.in/';

const COMMODITY_MAP: Record<string, { en: string; hi: string }> = {
  'Wheat': { en: 'Wheat', hi: 'गेहूं' },
  'Soyabean': { en: 'Soybean', hi: 'सोयाबीन' },
  'Mustard': { en: 'Mustard', hi: 'सरसों' },
  'Maize': { en: 'Maize', hi: 'मक्का' },
  'Garlic': { en: 'Garlic', hi: 'लहसुन' },
  'Onion': { en: 'Onion', hi: 'प्याज' },
  'Coriander(Leaves)': { en: 'Coriander', hi: 'धनिया' },
  'Groundnut': { en: 'Groundnut', hi: 'मूंगफली' },
  'Barley (Jau)': { en: 'Barley', hi: 'जौ' },
  'Linseed': { en: 'Linseed', hi: 'अलसी' },
  'Methi Seeds': { en: 'Fenugreek', hi: 'मेथी' },
  'Sesame (Til)': { en: 'Sesame', hi: 'तिल' },
  'Jowar(Sorghum)': { en: 'Sorghum', hi: 'ज्वार' },
  'Cummin Seed(Jeera)': { en: 'Cumin', hi: 'जीरा' },
  'Ajwan': { en: 'Ajwain', hi: 'अजवाइन' },
  'Isabgol': { en: 'Psyllium', hi: 'इसबगोल' },
  'Neem Seed': { en: 'Neem Seed', hi: 'नीम का बीज' },
  'Ashwagandha': { en: 'Ashwagandha', hi: 'अश्वगंधा' },
  'Green Gram (Moong)(Whole)': { en: 'Green Gram', hi: 'हरा मूंग' },
  'Arhar Dal(Tur Dal)': { en: 'Arhar Dal', hi: 'अरहर दाल' },
  'Lentil (Masur) Dal': { en: 'Masoor Dal', hi: 'मसूर दाल' },
  'Kabuli Chana(Chickpeas-White)': { en: 'Chickpea', hi: 'काबुली चना' },
  'Guar Seed(Cluster Beans Seed)': { en: 'Guar', hi: 'ग्वार' },
  'Taramira': { en: 'Taramira', hi: 'तारामीरा' },
  'Saffron': { en: 'Saffron', hi: 'केसर' },
  'Snake Gourd': { en: 'Snake Gourd', hi: 'चिचिंडा' },
  'Rose(Loose)': { en: 'Rose', hi: 'गुलाब' },
  'Peas(Dry)': { en: 'Peas', hi: 'मटर' },
  'Bitter Gourd': { en: 'Bitter Gourd', hi: 'करेला' },
  'Other': { en: 'Other', hi: 'अन्य' },
};

function parsePrice(text: string): number {
  const cleaned = text.replace(/[₹,\s\/Qt]/gi, '');
  const match = cleaned.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function mapCommodityName(name: string): { en: string; hi: string } {
  const cleaned = name.trim();
  if (COMMODITY_MAP[cleaned]) {
    return COMMODITY_MAP[cleaned];
  }
  for (const [key, value] of Object.entries(COMMODITY_MAP)) {
    if (cleaned.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return { en: cleaned, hi: cleaned };
}

export async function fetchNeemuchMandiPrices(): Promise<MandiPriceResponse> {
  try {
    const response = await fetch(NEEMUCH_MANDI_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MandiFinanceBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const prices = parseMandiHtml(html);

    return {
      success: true,
      data: prices,
      lastUpdated: new Date().toISOString(),
      source: 'neemuchmandibhav.in',
    };
  } catch (error) {
    console.error('Failed to fetch Neemuch mandi prices:', error);
    return {
      success: false,
      data: getFallbackPrices(),
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function parseMandiHtml(html: string): MandiPriceData[] {
  const prices: MandiPriceData[] = [];
  const seen = new Set<string>();

  const detailRowRegex = /<tr class="collapse d-md-table-row[^"]*"[^>]*>[\s\S]*?<td[^>]*data-label="Commodity"[^>]*>.*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<\/td>\s*<td[^>]*data-label="Variety"[^>]*>\(?([^)]*)\)?<\/td>\s*<td[^>]*data-label="Min\. Price"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*data-label="Max\. Price"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*data-label="Modal Price"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*data-label="Date of price"[^>]*>([\s\S]*?)<\/td>/gi;

  let match;
  while ((match = detailRowRegex.exec(html)) !== null) {
    const commodityRaw = match[1].trim();
    const variety = match[2].trim() || 'FAQ';
    const minPrice = parsePrice(match[3]);
    const maxPrice = parsePrice(match[4]);
    const modalPrice = parsePrice(match[5]);
    const date = match[6].trim();

    const key = `${commodityRaw}-${variety}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (minPrice > 0 && maxPrice > 0) {
      const mapped = mapCommodityName(commodityRaw);
      prices.push({
        commodity: mapped.en,
        commodityHi: mapped.hi,
        variety,
        minPrice,
        maxPrice,
        modalPrice: modalPrice || Math.round((minPrice + maxPrice) / 2),
        unit: 'Quintal',
        date,
        source: 'neemuchmandibhav.in',
      });
    }
  }

  if (prices.length === 0) {
    const simpleRegex = /<a href='[^']*'>([^<]+)<\/a>\s*<small>\(([^)]+)\)<\/small>[\s\S]*?₹([\d,]+)\s*[-–]\s*₹([\d,]+)/gi;
    while ((match = simpleRegex.exec(html)) !== null) {
      const commodityRaw = match[1].trim();
      const date = match[2].trim();
      const minPrice = parsePrice(match[3]);
      const maxPrice = parsePrice(match[4]);

      const key = `${commodityRaw}-${date}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (minPrice > 0 && maxPrice > 0) {
        const mapped = mapCommodityName(commodityRaw);
        prices.push({
          commodity: mapped.en,
          commodityHi: mapped.hi,
          variety: 'FAQ',
          minPrice,
          maxPrice,
          modalPrice: Math.round((minPrice + maxPrice) / 2),
          unit: 'Quintal',
          date,
          source: 'neemuchmandibhav.in',
        });
      }
    }
  }

  return prices;
}

function getFallbackPrices(): MandiPriceData[] {
  return [
    { commodity: 'Wheat', commodityHi: 'गेहूं', variety: 'Local', minPrice: 2268, maxPrice: 2940, modalPrice: 2540, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Maize', commodityHi: 'मक्का', variety: 'Local', minPrice: 1660, maxPrice: 2002, modalPrice: 1900, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Barley', commodityHi: 'जौ', variety: 'Other', minPrice: 1801, maxPrice: 2476, modalPrice: 2250, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Urad', commodityHi: 'उड़द', variety: 'Dal', minPrice: 6600, maxPrice: 8381, modalPrice: 7200, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Chickpea', commodityHi: 'चना', variety: 'Gram', minPrice: 4601, maxPrice: 5875, modalPrice: 5400, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Masoor Dal', commodityHi: 'मसूर', variety: 'Dal', minPrice: 5100, maxPrice: 7950, modalPrice: 7000, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Soybean', commodityHi: 'सोयाबीन', variety: 'Soyabeen', minPrice: 5800, maxPrice: 7200, modalPrice: 7000, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Groundnut', commodityHi: 'मूंगफली', variety: 'Local', minPrice: 5500, maxPrice: 8240, modalPrice: 7000, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Linseed', commodityHi: 'अलसी', variety: 'Other', minPrice: 7500, maxPrice: 9350, modalPrice: 8900, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Sesame', commodityHi: 'तिल', variety: 'Red', minPrice: 5800, maxPrice: 12720, modalPrice: 10000, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Fenugreek', commodityHi: 'मेथी', variety: 'Methiseeds', minPrice: 4830, maxPrice: 9000, modalPrice: 6400, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Coriander', commodityHi: 'धनिया', variety: 'Other', minPrice: 9500, maxPrice: 13400, modalPrice: 11750, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Mustard', commodityHi: 'सरसों', variety: 'Mustard', minPrice: 4200, maxPrice: 6317, modalPrice: 6317, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Garlic', commodityHi: 'लहसुन', variety: 'Other', minPrice: 1200, maxPrice: 6000, modalPrice: 1500, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
    { commodity: 'Onion', commodityHi: 'प्याज', variety: 'Local', minPrice: 501, maxPrice: 1380, modalPrice: 1380, unit: 'Quintal', date: '14 Jun 26', source: 'fallback' },
  ];
}

export async function fetchMandiPricesByCommodity(commodity: string): Promise<MandiPriceResponse> {
  const allPrices = await fetchNeemuchMandiPrices();

  if (!allPrices.success) {
    return allPrices;
  }

  const filtered = allPrices.data.filter(p =>
    p.commodity.toLowerCase().includes(commodity.toLowerCase()) ||
    p.commodityHi.includes(commodity)
  );

  return {
    ...allPrices,
    data: filtered,
  };
}