import CategoryRule from '../../models/CategoryRule.js';

// ---------------------------------------------------------------------------
// Keyword buckets (step 7) — whole-word matching
// ---------------------------------------------------------------------------
const KEYWORD_BUCKETS = [
  { category: 'Investment',         keywords: ['GROWW','ZERODHA','INDMONEY','NEXTBILLION','MUTUAL','SIP','SMALLCASE'] },
  { category: 'Food & Dining',      keywords: ['SWIGGY','ZOMATO','DOMINO','DOMINOS','MCDONALD','KFC','EATCLUB','BOX8','RESTAURANT','CAFE','PIZZA','BIRYANI','BAKERY'] },
  { category: 'Shopping',           keywords: ['AMAZON','FLIPKART','MYNTRA','AJIO','MEESHO','NYKAA','SNAPDEAL'] },
  { category: 'Bills & Utilities',  keywords: ['JIO','AIRTEL','VODAFONE','BSNL','RECHARGE','DTH','ELECTRIC','BESCOM','BSES','BROADBAND'] },
  { category: 'Fuel',               keywords: ['PETROL','FUEL','HPCL','IOCL','SHELL'] },
  { category: 'Travel & Transport', keywords: ['IRCTC','UBER','OLA','OLACABS','RAPIDO','REDBUS','MAKEMYTRIP','IXIGO','OYO','GOIBIBO','METRO'] },
  { category: 'Insurance',          keywords: ['INSURANCE','POLICY','PREMIUM','LIC'] },
  { category: 'Subscriptions',      keywords: ['NETFLIX','SPOTIFY','YOUTUBE','HOTSTAR','ADOBE','OPENAI','FIGMA','GITHUB','NOTION','CANVA','AWS'] },
];

function wholeWord(text, kw) {
  return new RegExp('\\b' + kw + '\\b').test(text);
}

// ---------------------------------------------------------------------------
// Main categorizer
// ---------------------------------------------------------------------------
export async function assignCategory({ paymentType, merchantName, userNote, rawNarration }) {
  const t = [rawNarration, merchantName, userNote].filter(Boolean).join(' ').toUpperCase();

  // 1. Salary
  if (t.includes('GUSTO')) return 'Salary / Income';

  // 2. Income tax
  if (t.includes('CBDT') || t.includes('INCOME TAX')) return 'Income Tax';

  // 3. Credit card payment
  if (t.includes('CRED CLUB') || t.includes('CREDCLUB') || t.includes('CRED.CLUB')) return 'Credit Card Payment';

  // 4. Bank interest
  if (t.includes('INTEREST')) return 'Bank Interest';

  // 5. Specific service overrides
  if (t.includes('GOOGLE CLOUD')) return 'Subscriptions';
  if (t.includes('HDFC LIFE'))    return 'Insurance';

  // 6. Rent (but not CURRENT)
  if (t.includes('RENT') && !t.includes('CURRENT')) return 'Rent';

  // 7. Keyword bucket match (whole word)
  for (const bucket of KEYWORD_BUCKETS) {
    for (const kw of bucket.keywords) {
      if (wholeWord(t, kw)) return bucket.category;
    }
  }

  // 8. ATM / Cash
  if (wholeWord(t, 'ATM') || wholeWord(t, 'NWD') || t.includes('CASH WDL')) return 'ATM / Cash';

  // 9. Bank Transfer
  if (wholeWord(t, 'IMPS') || wholeWord(t, 'NEFT') || wholeWord(t, 'RTGS')) return 'Bank Transfer';

  // 10. UPI Payment
  if (t.includes('UPI')) return 'UPI Payment';

  // 11. Fallback
  return 'Uncategorized';
}
