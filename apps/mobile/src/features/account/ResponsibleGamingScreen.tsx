import { Clock, HandCoins, LifeBuoy, PauseCircle, Phone, ShieldOff } from 'lucide-react-native';
import React from 'react';
import { Linking, ScrollView, StyleSheet } from 'react-native';

import { Card, ListRow, Screen, ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * M10 — Responsible gaming: entry points for limits, cool-off, and self-exclusion plus support
 * resources. The controls surface the tools; the underlying limit/exclusion flows are gated
 * compliance features (server-enforced) — here we present them and link out to help.
 */
export function ResponsibleGamingScreen(): React.JSX.Element {
  const theme = useTheme();
  const iconColor = theme.colors.text.secondary;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ThemedText variant="body" color="secondary" style={styles.intro}>
          Stay in control of your play. Set limits, take a break, or reach out for support at any
          time.
        </ThemedText>

        <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
          Play limits
        </ThemedText>
        <Card>
          <ListRow
            icon={<HandCoins size={20} color={iconColor} />}
            title="Deposit limit"
            subtitle="Cap how much you can add"
            onPress={() => {}}
          />
          <ListRow
            icon={<Clock size={20} color={iconColor} />}
            title="Time limit"
            subtitle="Set a session reminder"
            onPress={() => {}}
          />
        </Card>

        <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
          Take a break
        </ThemedText>
        <Card>
          <ListRow
            icon={<PauseCircle size={20} color={iconColor} />}
            title="Cool-off period"
            subtitle="Pause play for 24h to 6 weeks"
            onPress={() => {}}
          />
          <ListRow
            icon={<ShieldOff size={20} color={theme.colors.state.error} />}
            title="Self-exclusion"
            subtitle="Block access for 6 months or more"
            onPress={() => {}}
          />
        </Card>

        <ThemedText variant="label" color="muted" style={styles.sectionLabel}>
          Get support
        </ThemedText>
        <Card>
          <ListRow
            icon={<LifeBuoy size={20} color={iconColor} />}
            title="Support resources"
            subtitle="Guidance and organisations that can help"
            onPress={() => void Linking.openURL('https://www.begambleaware.org')}
          />
          <ListRow
            icon={<Phone size={20} color={iconColor} />}
            title="Helpline"
            subtitle="Speak to someone confidentially"
            onPress={() => void Linking.openURL('tel:18005224700')}
          />
        </Card>

        <ThemedText variant="body" color="muted" style={styles.footnote}>
          If gambling stops being fun, help is available 24/7. You are not alone.
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: 16, paddingBottom: 32 },
  intro: { marginBottom: 20 },
  sectionLabel: { marginTop: 20, marginBottom: 8 },
  footnote: { marginTop: 24, textAlign: 'center' },
});
