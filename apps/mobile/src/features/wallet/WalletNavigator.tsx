import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useTheme } from '../../theme/ThemeProvider';

import { BlePairingScreen } from './BlePairingScreen';
import { DepositScreen } from './DepositScreen';
import { MachineSessionScreen } from './MachineSessionScreen';
import { PaymentMethodsScreen } from './PaymentMethodsScreen';
import { QrScanScreen } from './QrScanScreen';
import { ScanPlayScreen } from './ScanPlayScreen';
import { TransactionDetailScreen } from './TransactionDetailScreen';
import { TransactionHistoryScreen } from './TransactionHistoryScreen';
import { TransferScreen } from './TransferScreen';
import { WalletHomeScreen } from './WalletHomeScreen';
import { WithdrawScreen } from './WithdrawScreen';

import type { WalletStackParamList } from './types';

const Stack = createNativeStackNavigator<WalletStackParamList>();

/**
 * Scan/Play (Wallet + cardless) tab stack. Entry is the Scan/Play chooser (S1, header hidden — the
 * tab's TopBar stands in); pairing, machine session, and the wallet money/history/payment-method
 * screens (S2–S10) push on top with their own titles.
 */
export function WalletNavigator(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg.base },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: { fontFamily: theme.fontFamily.sans },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.bg.base },
      }}
    >
      <Stack.Screen name="ScanPlay" component={ScanPlayScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BlePairing" component={BlePairingScreen} options={{ title: 'Nearby machines' }} />
      <Stack.Screen name="QrScan" component={QrScanScreen} options={{ title: 'Scan QR' }} />
      <Stack.Screen name="MachineSession" component={MachineSessionScreen} options={{ title: 'Machine' }} />
      <Stack.Screen name="WalletHome" component={WalletHomeScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="Deposit" component={DepositScreen} options={{ title: 'Deposit' }} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} options={{ title: 'Cash out' }} />
      <Stack.Screen name="Transfer" component={TransferScreen} options={{ title: 'Transfer' }} />
      <Stack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ title: 'History' }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ title: 'Transaction' }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ title: 'Payment methods' }}
      />
    </Stack.Navigator>
  );
}
