import React, { useEffect, useRef } from "react";
import { Animated, View, ViewStyle, DimensionValue } from "react-native";
import { colors, radius } from "../../theme";

/** Wraps its children in one shared pulsing opacity animation — one
 * Animated.loop per skeleton group, not per placeholder shape, so a
 * screen with many bones pulses as one cohesive block instead of each
 * shape animating independently (wasteful and visually noisy). */
export const SkeletonPulse: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
};

/** A single placeholder "bone" — compose several inside a SkeletonPulse to
 * build a screen-specific skeleton layout matching the real content. */
export const SkeletonBlock: React.FC<{
  width?: DimensionValue;
  height?: number;
  blockRadius?: number;
  style?: ViewStyle;
}> = ({ width = "100%", height = 14, blockRadius = radius.sm, style }) => (
  <View style={[{ width, height, borderRadius: blockRadius, backgroundColor: colors.borderStrong }, style]} />
);
