import React, { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '../../components';
import { useTheme } from '../../theme/ThemeProvider';

import { usePlanVisitMutation } from './conciergeApi';
import { useConciergePersona } from './useConciergePersona';

/**
 * "Plan my visit" bottom sheet (P6.6): POSTs /concierge/plan on open and renders the
 * deterministic itinerary (leave time → first stop → offer order). Core Modal styled as a
 * bottom sheet — no extra sheet dependency.
 */
export function PlanSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { accentColor } = useConciergePersona();
  const [planVisit, state] = usePlanVisitMutation();

  useEffect(() => {
    if (visible && !state.data && !state.isLoading) {
      void planVisit({});
    }
  }, [visible, state.data, state.isLoading, planVisit]);

  const plan = state.data;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close plan" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.bg.elevated, borderColor: theme.colors.border.soft },
        ]}
        testID="plan-sheet"
      >
        <View style={[styles.grabber, { backgroundColor: theme.colors.border.strong }]} />
        <ThemedText variant="h2">Your visit, planned</ThemedText>
        {plan ? (
          <>
            <ThemedText variant="body" color="muted" style={styles.verdict}>
              {plan.verdict}
            </ThemedText>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.steps}>
              {plan.itinerary.map((step, index) => (
                <View
                  key={step.time + step.title}
                  style={styles.step}
                  testID={`plan-step-${index}`}
                >
                  <View style={styles.timeline}>
                    <View style={[styles.dot, { backgroundColor: accentColor }]} />
                    {index < plan.itinerary.length - 1 ? (
                      <View style={[styles.line, { backgroundColor: theme.colors.border.soft }]} />
                    ) : null}
                  </View>
                  <View style={styles.stepBody}>
                    <ThemedText variant="mono" color="muted">
                      {step.time}
                    </ThemedText>
                    <ThemedText variant="title">{step.title}</ThemedText>
                    <ThemedText variant="body" color="muted">
                      {step.detail}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </ScrollView>
            <ThemedText variant="label" color="faint">
              {plan.disclaimer}
            </ThemedText>
          </>
        ) : (
          <ThemedText variant="body" color="muted" style={styles.verdict}>
            {state.isError ? 'Could not build a plan right now.' : 'Planning…'}
          </ThemedText>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 8,
    maxHeight: '75%',
    gap: 8,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  verdict: { marginBottom: 4 },
  steps: { marginVertical: 8 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timeline: { alignItems: 'center', width: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  line: { flex: 1, width: 1, marginTop: 2 },
  stepBody: { flex: 1, paddingBottom: 14 },
});
