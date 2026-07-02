import { CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import type { OffersStackParamList } from './types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<OffersStackParamList, 'RedemptionConfirmation'>;

/** O6 — redemption confirmation: success state + voucher code to present at the venue. */
export function RedemptionConfirmationScreen({ navigation, route }: Props): React.JSX.Element {
  const theme = useTheme();
  const { title, code } = route.params;
  return (
    <Screen>
      <View style={styles.center}>
        <CheckCircle2 size={56} color={theme.colors.state.success} />
        <ThemedText variant="h1" style={styles.heading}>
          Redeemed!
        </ThemedText>
        <ThemedText variant="body" color="muted" style={styles.subtitle}>
          {title} is ready to use.
        </ThemedText>

        <Card style={styles.codeCard}>
          <ThemedText variant="label" color="muted">
            Voucher code
          </ThemedText>
          <ThemedText variant="display" style={{ color: theme.colors.brand.gold, marginTop: 6 }}>
            {code}
          </ThemedText>
        </Card>

        <Button
          label="Done"
          variant="secondary"
          onPress={() => navigation.navigate('OffersHome', { tab: 'offers' })}
          style={styles.done}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { marginTop: 16 },
  subtitle: { marginTop: 4, textAlign: 'center' },
  codeCard: { marginTop: 32, alignItems: 'center', paddingHorizontal: 40 },
  done: { marginTop: 32, alignSelf: 'stretch' },
});
