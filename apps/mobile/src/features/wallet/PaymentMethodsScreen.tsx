import { CreditCard, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import uuid from 'react-native-uuid';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { Button, Card, Input, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { detectCardBrand, isPlausibleCard, last4 } from './cards';
import { addPaymentMethod, removePaymentMethod } from './paymentMethodsSlice';

/**
 * S10 — Payment methods (mock). Cards are tokenized display-only records; the PAN never leaves the
 * form. Add derives brand + last four; remove drops the token. A real build delegates to PaymentPort.
 */
export function PaymentMethodsScreen(): React.JSX.Element {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const methods = useAppSelector((s) => s.paymentMethods.methods);

  const [adding, setAdding] = useState(false);
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');

  const valid = isPlausibleCard(number) && /^\d{2}\/\d{2}$/.test(exp.trim());

  function add(): void {
    if (!valid) return;
    dispatch(
      addPaymentMethod({
        id: `pm_${String(uuid.v4())}`,
        brand: detectCardBrand(number),
        last4: last4(number),
        exp: exp.trim(),
      }),
    );
    setNumber('');
    setExp('');
    setAdding(false);
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          {methods.length === 0 ? (
            <ThemedText variant="body" color="muted">
              No saved cards.
            </ThemedText>
          ) : (
            methods.map((m) => (
              <View
                key={m.id}
                style={[styles.row, { borderBottomColor: theme.colors.border.soft }]}
              >
                <CreditCard size={20} color={theme.colors.text.secondary} />
                <View style={styles.rowBody}>
                  <ThemedText variant="title">
                    {m.brand} •••• {m.last4}
                  </ThemedText>
                  <ThemedText variant="label" color="muted">
                    Expires {m.exp}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${m.brand} ending ${m.last4}`}
                  onPress={() => dispatch(removePaymentMethod(m.id))}
                  testID={`remove-${m.id}`}
                >
                  <Trash2 size={18} color={theme.colors.state.error} />
                </Pressable>
              </View>
            ))
          )}
        </Card>

        {adding ? (
          <Card style={styles.card}>
            <Input
              label="Card number"
              placeholder="4242 4242 4242 4242"
              keyboardType="number-pad"
              value={number}
              onChangeText={setNumber}
            />
            <Input
              label="Expiry (MM/YY)"
              placeholder="08/28"
              value={exp}
              onChangeText={setExp}
              containerStyle={styles.exp}
            />
            <Button
              label="Save card"
              disabled={!valid}
              style={styles.save}
              onPress={add}
              testID="save-card"
            />
            <Button
              label="Cancel"
              variant="secondary"
              style={styles.cancel}
              onPress={() => setAdding(false)}
            />
          </Card>
        ) : (
          <Button
            label="Add payment method"
            icon={<Plus size={18} color={theme.colors.brand.onGold} />}
            onPress={() => setAdding(true)}
            testID="add-method"
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  card: { marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, marginLeft: 12 },
  exp: { marginTop: 12 },
  save: { marginTop: 16 },
  cancel: { marginTop: 10 },
});
