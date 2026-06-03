export const BANKS = [
  { id: 'HDFC_BANK',       name: 'HDFC Bank',            statementType: 'bank',        supportedFormats: ['delimited', 'excel'] },
  { id: 'SBI_BANK',        name: 'State Bank of India',  statementType: 'bank',        supportedFormats: ['excel', 'csv'] },
  { id: 'UCO_BANK',        name: 'UCO Bank',             statementType: 'bank',        supportedFormats: ['excel'] },
  { id: 'YES_CC',          name: 'YES Bank Credit Card', statementType: 'credit_card', supportedFormats: ['excel'] },
  { id: 'ICICI_AMAZON_CC', name: 'ICICI Amazon Pay Card',statementType: 'credit_card', supportedFormats: ['excel', 'csv'] },
];

export const BANK_IDS = BANKS.map(b => b.id);
