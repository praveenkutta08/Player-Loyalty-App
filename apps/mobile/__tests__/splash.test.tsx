import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Splash } from '../src/features/splash/Splash';
import {
  back,
  collectionFrame,
  eio,
  eo,
  expo,
  handOff,
  journeyBezier,
  journeyFrame,
  journeyPathLength,
  lerp,
  NATIVE_DURATION_S,
  portalFrame,
  resolveSplashConfig,
  seg,
  silkFrame,
  toNativeClock,
} from '../src/features/splash/timeline';
import { ThemeProvider } from '../src/theme/ThemeProvider';

// ------------------------------------------------------------------ helpers (verbatim spec)
describe('interpolation helpers', () => {
  it('matches the studio easing definitions', () => {
    expect(eo(0.5)).toBeCloseTo(0.875, 6); // easeOutCubic
    expect(eio(0.25)).toBeCloseTo(0.0625, 6); // easeInOutCubic
    expect(eio(0.75)).toBeCloseTo(0.9375, 6);
    expect(expo(0.5)).toBeCloseTo(0.96875, 6); // easeOutExpo
    expect(expo(1)).toBe(1);
    expect(back(0.5)).toBeCloseTo(1.0375, 6); // overshoot c1=1.3
    expect(back(1)).toBeCloseTo(1, 6);
    expect(seg(1.0, 0.7, 1.3)).toBeCloseTo(0.5, 6);
    expect(lerp(10, 0, 0.875)).toBeCloseTo(1.25, 6);
  });

  it('shared hand-off: scene fades and emblem heads to the header in the final 200ms', () => {
    const before = handOff(2.0, 2.2);
    expect(before.sceneOpacity).toBe(1);
    const mid = handOff(2.1, 2.2); // he = eio(0.5) = 0.5
    expect(mid.sceneOpacity).toBeCloseTo(0.5, 6);
    expect(mid.handY).toBeCloseTo(-95, 6);
    expect(mid.handScale).toBeCloseTo(0.71, 6);
    const end = handOff(2.2, 2.2);
    expect(end.sceneOpacity).toBe(0);
    expect(end.handScale).toBeCloseTo(0.42, 6);
  });
});

// ------------------------------------------------------------------ variant timelines
// Sampled t values hand-derived from the studio math (SplashScreen.dc.html).
describe('silk timeline (T=2.2s)', () => {
  it('t=1.0: emblem emerges in ribbon B’s wake', () => {
    const frame = silkFrame(1.0);
    expect(frame.emblem.opacity).toBeCloseTo(0.875, 4);
    expect(frame.emblem.translateY).toBeCloseTo(1.25, 4);
    expect(frame.emblem.scale).toBeCloseTo(0.995, 4);
    expect(frame.emblem.blur).toBeCloseTo(0.75, 4);
    expect(frame.handOff.sceneOpacity).toBe(1); // hand-off hasn't started
  });

  it('t=1.0: ribbon B crosses with its sine drift + envelope', () => {
    const b = silkFrame(1.0).ribbonB;
    // rp=0.7778, eio→0.9561; x = lerp(24,-12) + 1.6·sin(1.4·1.0+2.1)
    expect(b.translateX).toBeCloseTo(-10.981, 2);
    expect(b.opacity).toBeCloseTo(0.6035, 3);
  });

  it('t=1.4: wordmark rising', () => {
    const w = silkFrame(1.4).wordmark;
    expect(w.nameOpacity).toBeCloseTo(0.9122, 3);
    expect(w.nameTranslateY).toBeCloseTo(lerp(8, 0, 0.9122), 3);
    expect(w.ruleOpacity).toBeCloseTo(0, 6); // rule opacity window starts at 1.4
  });
});

describe('portal timeline (T=2.4s)', () => {
  it('t=0.8: aperture nearly open, emblem reveal beginning', () => {
    const frame = portalFrame(0.8);
    expect(frame.bloomScale).toBeCloseTo(1, 6);
    expect(frame.ringScale).toBeCloseTo(lerp(0.55, 1, expo(2 / 3)), 5);
    expect(frame.ringOpacity).toBeCloseTo(0.9, 6);
    expect(frame.emblemOpacity).toBeCloseTo(1, 6); // min(1, seg·1.5)
    expect(frame.emblemClip).toBeCloseTo(lerp(0, 75, eio(1 / 3)), 4);
    expect(frame.emblemScale).toBeCloseTo(lerp(1.05, 1, eio(1 / 3)), 5);
  });

  it('t=1.25: outer frame echoing outward', () => {
    const frame = portalFrame(1.25);
    expect(frame.frameScale).toBeCloseTo(lerp(1.0, 1.22, eo(seg(1.25, 0.9, 1.3))), 5);
    expect(frame.frameOpacity).toBeCloseTo(0.25, 6);
  });
});

describe('collection timeline (T=2.4s)', () => {
  it('t=0.6: card 1 landed (back-eased rotation), card 3 mid-fall', () => {
    const frame = collectionFrame(0.6);
    expect(frame.card1.translateYPct).toBeCloseTo(0, 4);
    expect(frame.card1.rotate).toBeCloseTo(-8, 4); // rotFrom -15 → rotTo -8 at cp=1
    expect(frame.card1.opacity).toBe(1);
    expect(frame.card3.translateYPct).toBeCloseTo(-86.397, 1);
    expect(frame.card3.rotate).toBeCloseTo(-0.8948, 2);
  });

  it('hand-off recedes the stack (y −8%, scale 0.92 at completion)', () => {
    const done = collectionFrame(2.4);
    expect(done.stackRecedeY).toBeCloseTo(-8, 4);
    expect(done.stackScale).toBeCloseTo(0.92, 4);
  });
});

describe('journey timeline (T=2.6s)', () => {
  it('evaluates the bézier exactly like the studio (32-sample length)', () => {
    expect(journeyBezier(0)).toEqual({ x: 14, y: 196 });
    expect(journeyBezier(1)).toEqual({ x: 50, y: 108 });
    const L = journeyPathLength();
    expect(L).toBeGreaterThan(100);
    expect(L).toBeLessThan(120); // studio polyline ≈ 106–112
  });

  it('t=1.0: traveler riding the path, terrain settled with drift', () => {
    const frame = journeyFrame(1.0);
    expect(frame.traveler.x).toBeCloseTo(53.28, 1);
    expect(frame.traveler.y).toBeCloseTo(151.3, 1);
    expect(frame.traveler.opacity).toBeCloseTo(1, 4);
    expect(frame.terrainBack.opacity).toBeCloseTo(0.92, 4);
    expect(frame.terrainBack.driftX).toBeCloseTo(1.2 * Math.sin(0.9), 4);
  });

  it('t=1.6: path dissolving once its purpose is complete; emblem arriving', () => {
    const frame = journeyFrame(1.6);
    expect(frame.pathDashProgress).toBeCloseTo(1, 3); // eio(seg(1.6,0.5,1.45)) clamps to 1
    expect(frame.pathOpacity).toBeLessThan(0.85); // 1.5–1.9 fade underway
    expect(frame.emblem.opacity).toBeCloseTo(eo(0.5), 4);
    expect(frame.emblem.scale).toBeCloseTo(lerp(0.6, 1, eo(0.5)), 4);
  });
});

// ------------------------------------------------------------------ config resolution
describe('splash config resolution', () => {
  it('falls back to silk on unknown/missing variants (never horizon)', () => {
    expect(resolveSplashConfig({ variant: 'horizon' }).variant).toBe('silk');
    expect(resolveSplashConfig(undefined).variant).toBe('silk');
    expect(resolveSplashConfig({ variant: 'journey' }).variant).toBe('journey');
  });

  it('rescales the native timeline linearly with a 1800–3000ms clamp', () => {
    expect(resolveSplashConfig({ variant: 'silk' }).durationS).toBeCloseTo(2.2);
    expect(
      resolveSplashConfig({ variant: 'silk', animation_duration_ms: 5000 }).durationS,
    ).toBeCloseTo(3.0);
    expect(
      resolveSplashConfig({ variant: 'silk', animation_duration_ms: 500 }).durationS,
    ).toBeCloseTo(1.8);
    // A rescaled clock evaluates at the same native-timeline proportions.
    expect(toNativeClock(1.5, 'silk', 3.0)).toBeCloseTo(1.1, 6);
    expect(toNativeClock(1.1, 'silk', NATIVE_DURATION_S.silk)).toBeCloseTo(1.1, 6);
  });
});

// ------------------------------------------------------------------ component behaviour
function wrap(node: React.ReactElement) {
  return render(<ThemeProvider initialScheme="dark">{node}</ThemeProvider>);
}

describe('<Splash> component', () => {
  it('renders silk from bundled defaults with no manifest (never blank, no network block)', () => {
    wrap(<Splash splash={undefined} brandName="Meridian" onDone={jest.fn()} />);
    expect(screen.getByTestId('splash-variant-silk')).toBeOnTheScreen();
    expect(screen.getByTestId('splash-name')).toHaveTextContent('MERIDIAN');
  });

  it('reduced motion: skips timelines, cross-fades the final frame, then navigates', async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    wrap(
      <Splash
        splash={{ variant: 'portal' }}
        brandName="Meridian"
        onDone={onDone}
        reducedMotionOverride
      />,
    );
    expect(screen.getByTestId('splash-variant-portal')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(400); // > the 300ms cross-fade
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('collection privacy: logged-out shows no tier and no card number', () => {
    wrap(
      <Splash
        splash={{ variant: 'collection' }}
        brandName="Meridian"
        memberTier={null}
        onDone={jest.fn()}
        reducedMotionOverride
      />,
    );
    expect(screen.getByTestId('splash-variant-collection')).toBeOnTheScreen();
    expect(screen.queryByTestId('splash-tier')).toBeNull();
    expect(screen.queryByTestId('splash-masked-number')).toBeNull();
  });

  it('collection logged-in: tier label + decorative MASKED digits only', () => {
    wrap(
      <Splash
        splash={{ variant: 'collection' }}
        brandName="Meridian"
        memberTier="gold"
        onDone={jest.fn()}
        reducedMotionOverride
      />,
    );
    expect(screen.getByTestId('splash-tier')).toHaveTextContent('GOLD');
    expect(screen.getByTestId('splash-masked-number')).toHaveTextContent('•••• ••••');
  });

  it('journey renders terrain + traveler from the manifest environment paths', () => {
    wrap(
      <Splash
        splash={{
          variant: 'journey',
          environment_theme: 'mountain',
          environment_theme_paths: {
            back: 'M0 178 L100 174 L100 216 L0 216 Z',
            front: 'M0 192 L100 182 L100 216 L0 216 Z',
          },
        }}
        brandName="Meridian"
        onDone={jest.fn()}
        reducedMotionOverride
      />,
    );
    expect(screen.getByTestId('splash-variant-journey')).toBeOnTheScreen();
    expect(screen.getByTestId('splash-traveler')).toBeOnTheScreen();
  });
});
