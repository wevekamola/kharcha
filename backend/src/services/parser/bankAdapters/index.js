import * as hdfc  from './hdfc_bank.js';
import * as sbi   from './sbi_bank.js';
import * as uco   from './uco_bank.js';
import * as yesCC from './yes_cc.js';
import * as icici from './icici_amazon_cc.js';

const registry = {
  HDFC_BANK:       hdfc,
  SBI_BANK:        sbi,
  UCO_BANK:        uco,
  YES_CC:          yesCC,
  ICICI_AMAZON_CC: icici,
};

export function getAdapter(bankId) {
  const adapter = registry[bankId];
  if (!adapter) throw new Error(`No adapter found for bankId: ${bankId}`);
  return adapter;
}
