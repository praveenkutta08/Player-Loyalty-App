import { AtSign, BadgeCheck, Phone, Sparkles } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, ListRow, Screen, StatusPill, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { useGetAccountMeQuery } from './accountApi';
import { kycView } from './kyc';

/**
 * C15 — Profile: view personal info + account status. Edit is intentionally deferred (no profile
 * write endpoint yet); the fields are surfaced read-only and clearly labelled.
 */
export function ProfileScreen(): React.JSX.Element {
  const theme = useTheme();
  const me = useGetAccountMeQuery();
  const kyc = kycView(me.data?.kyc_status);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
          Personal information
        </ThemedText>
        <Card>
          <ListRow
            icon={<AtSign size={20} color={theme.colors.text.secondary} />}
            title="Email"
            value={me.data?.email ?? '—'}
            showChevron={false}
          />
          <ListRow
            icon={<Phone size={20} color={theme.colors.text.secondary} />}
            title="Phone"
            value={me.data?.phone ?? 'Not added'}
            showChevron={false}
          />
          <ListRow
            icon={<Sparkles size={20} color={theme.colors.text.secondary} />}
            title="Segment"
            value={me.data?.segment ?? '—'}
            showChevron={false}
          />
        </Card>

        <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
          Account status
        </ThemedText>
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLabel}>
              <BadgeCheck size={18} color={theme.colors.text.muted} />
              <ThemedText variant="title" style={styles.statusText}>
                Membership
              </ThemedText>
            </View>
            <StatusPill label={me.data?.status ?? 'unknown'} tone="info" />
          </View>
          <View style={[styles.statusRow, styles.statusRowSpaced]}>
            <View style={styles.statusLabel}>
              <BadgeCheck size={18} color={theme.colors.text.muted} />
              <ThemedText variant="title" style={styles.statusText}>
                Verification
              </ThemedText>
            </View>
            <StatusPill label={kyc.label} tone={kyc.tone} />
          </View>
        </Card>

        <ThemedText variant="body" color="muted" style={styles.note}>
          To update your details, contact a host. In-app editing is coming soon.
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  sectionLabel: { marginTop: 8, marginBottom: 8 },
  statusCard: { gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusRowSpaced: { marginTop: 4 },
  statusLabel: { flexDirection: 'row', alignItems: 'center' },
  statusText: { marginLeft: 8 },
  note: { marginTop: 20 },
});
