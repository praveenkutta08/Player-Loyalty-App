/**
 * Scan/Play (Wallet + cardless) tab stack. Entry is the Scan/Play chooser (S1); it fans out to BLE
 * pairing (S2) / QR pairing (S3) → machine session (S4), and to the Wallet home (S5) with its
 * deposit/withdraw/transfer/history/payment-method detail screens (S6–S10).
 */
export type WalletStackParamList = {
  ScanPlay: undefined;
  BlePairing: undefined;
  QrScan: undefined;
  MachineSession: { egmId: string; sessionId: string; pairedVia: 'ble' | 'qr' };
  WalletHome: undefined;
  Deposit: undefined;
  Withdraw: undefined;
  Transfer: { egmId?: string } | undefined;
  TransactionHistory: undefined;
  TransactionDetail: { id: string };
  PaymentMethods: undefined;
};
