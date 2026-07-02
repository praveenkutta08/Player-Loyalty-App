import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ThemedText } from '../../../components';
import { useReducedMotion } from '../../../lib/reducedMotion';
import { useTheme } from '../../../theme/ThemeProvider';
import { useConciergePersona } from '../useConciergePersona';

/**
 * The concierge presence orb. Accent + initial come from the tenant manifest persona (golden
 * rule #5 — a tenant may call it "Ruby" with their own accent). Motion is a gentle drift +
 * pulse loop on transform/opacity only, skipped entirely under OS reduced motion.
 */
export function AriaOrb({ size = 44 }: { size?: number }): React.JSX.Element {
  const theme = useTheme();
  const { name, accentColor } = useConciergePersona();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const drift = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const halo = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.5] });

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`${name}, your concierge`}>
      <Animated.View
        style={[
          styles.halo,
          {
            backgroundColor: accentColor,
            opacity: reduced ? 0.3 : halo,
            transform: reduced ? [] : [{ scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          {
            borderColor: accentColor,
            backgroundColor: theme.colors.bg.elevated,
            transform: reduced ? [] : [{ translateY: drift }],
          },
        ]}
      >
        <ThemedText variant="title" style={{ color: accentColor }}>
          {name.slice(0, 1).toUpperCase()}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const fill = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

const styles = StyleSheet.create({
  halo: { ...fill, borderRadius: 999 },
  core: {
    ...fill,
    margin: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
