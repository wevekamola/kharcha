import { createRequire } from 'module';
import CategoryRule from '../../models/CategoryRule.js';

const require = createRequire(import.meta.url);
const defaultRules = require('./rules.json');

/**
 * Assigns a category to a parsed transaction.
 * Priority order (highest → lowest):
 *  1. userNote   vs user DB rules
 *  2. merchantName vs user DB rules
 *  3. userNote   vs default rules.json
 *  4. merchantName vs default rules.json
 *  5. paymentType fallback
 *  6. "other"
 */
export async function assignCategory(parsed) {
  const { paymentType, merchantName, userNote, rawNarration } = parsed;

  const userRules = await CategoryRule.find().sort({ priority: -1 }).lean();

  // Build unified rule list: user rules first (higher effective priority), then defaults
  const allRules = [...userRules, ...defaultRules].sort((a, b) => (b.priority || 10) - (a.priority || 10));

  const fields = {
    userNote:     userNote     ? userNote.toUpperCase()     : null,
    merchantName: merchantName ? merchantName.toUpperCase() : null,
    rawNarration: rawNarration ? rawNarration.toUpperCase() : null,
  };

  for (const rule of allRules) {
    const targets = ruleTargets(rule.appliesTo, fields);
    for (const target of targets) {
      if (target && matchesRule(target, rule)) return rule.category;
    }
  }

  // paymentType fallback
  const ptFallback = {
    ACH_DEBIT: 'emi',
    ATM:       'atm',
    TAX:       'tax',
    INTEREST:  'bank_charge',
  };
  if (ptFallback[paymentType]) return ptFallback[paymentType];

  return 'other';
}

function ruleTargets(appliesTo, fields) {
  if (appliesTo === 'any') return [fields.userNote, fields.merchantName, fields.rawNarration];
  return [fields[appliesTo] || null];
}

function matchesRule(text, rule) {
  const keyword = (rule.keyword || '').toUpperCase();
  switch (rule.matchType) {
    case 'exact':    return text === keyword;
    case 'regex':    return new RegExp(rule.keyword, 'i').test(text);
    case 'contains':
    default:         return text.includes(keyword);
  }
}
