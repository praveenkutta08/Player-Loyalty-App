import { detectCardBrand, isPlausibleCard, last4 } from '../src/features/wallet/cards';
import { formatMoney, parseAmountCents, txnLabel, txnTone } from '../src/features/wallet/money';
import paymentMethodsReducer, {
  addPaymentMethod,
  removePaymentMethod,
} from '../src/features/wallet/paymentMethodsSlice';
import { parseMachineQr } from '../src/features/wallet/qr';
import { simulatedMachines } from '../src/native/ble';

import type { PaymentMethod } from '../src/features/wallet/paymentMethodsSlice';

describe('money', () => {
  it('formats signed cents as currency', () => {
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(1234)).toBe('$12.34');
    expect(formatMoney(-500)).toBe('-$5.00');
  });

  it('parses only positive money with ≤2 decimals', () => {
    expect(parseAmountCents('12.34')).toBe(1234);
    expect(parseAmountCents('$20')).toBe(2000);
    expect(parseAmountCents('0.05')).toBe(5);
    expect(parseAmountCents('0')).toBeNull();
    expect(parseAmountCents('-5')).toBeNull();
    expect(parseAmountCents('1.234')).toBeNull();
    expect(parseAmountCents('abc')).toBeNull();
    expect(parseAmountCents('')).toBeNull();
  });

  it('labels and tones ledger entries', () => {
    expect(txnLabel('transfer_to_egm')).toBe('Transfer to machine');
    expect(txnLabel('fund')).toBe('Deposit');
    expect(txnTone('completed')).toBe('success');
    expect(txnTone('failed')).toBe('error');
    expect(txnTone('pending')).toBe('warning');
  });
});

describe('parseMachineQr', () => {
  it('accepts a bare EGM id (case-insensitive)', () => {
    expect(parseMachineQr('EGM-1042')).toBe('EGM-1042');
    expect(parseMachineQr('egm-2087')).toBe('EGM-2087');
  });

  it('accepts deep-link and query forms', () => {
    expect(parseMachineQr('casino://egm/EGM-1042')).toBe('EGM-1042');
    expect(parseMachineQr('https://play.example.com/pair?egm=EGM-3311')).toBe('EGM-3311');
  });

  it('rejects non-machine payloads', () => {
    expect(parseMachineQr('')).toBeNull();
    expect(parseMachineQr('hello world')).toBeNull();
    expect(parseMachineQr('EGM')).toBeNull();
  });
});

describe('cards', () => {
  it('detects brand from the leading digits', () => {
    expect(detectCardBrand('4242424242424242')).toBe('Visa');
    expect(detectCardBrand('5500 0000 0000 0004')).toBe('Mastercard');
    expect(detectCardBrand('3400 000000 00009')).toBe('Amex');
    expect(detectCardBrand('9999')).toBe('Card');
  });

  it('extracts the last four and checks length', () => {
    expect(last4('4242 4242 4242 1234')).toBe('1234');
    expect(isPlausibleCard('4242 4242 4242 4242')).toBe(true);
    expect(isPlausibleCard('4242')).toBe(false);
  });
});

describe('simulated BLE peripheral', () => {
  it('returns machines sorted by signal strength (strongest first)', () => {
    const machines = simulatedMachines();
    expect(machines.length).toBeGreaterThan(0);
    const rssis = machines.map((m) => m.rssi);
    expect([...rssis].sort((a, b) => b - a)).toEqual(rssis);
    expect(machines[0].id).toMatch(/^EGM-/);
  });
});

describe('paymentMethods slice', () => {
  const card: PaymentMethod = { id: 'pm_1', brand: 'Visa', last4: '1111', exp: '01/30' };

  it('adds and removes cards', () => {
    const start = paymentMethodsReducer(undefined, { type: '@@init' });
    const added = paymentMethodsReducer(start, addPaymentMethod(card));
    expect(added.methods).toContainEqual(card);

    const removed = paymentMethodsReducer(added, removePaymentMethod('pm_1'));
    expect(removed.methods.find((m) => m.id === 'pm_1')).toBeUndefined();
  });
});
