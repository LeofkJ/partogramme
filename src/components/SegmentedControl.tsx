/**
 * Minimal segmented control — a muted rounded track with an animated white
 * "thumb" that slides to the active option (iOS-style). Options can have
 * different label widths; the thumb measures each chip via onLayout and
 * animates to match instead of assuming equal segments.
 */
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleSheet,
} from "react-native";
import { colors, radius } from "../theme";

interface Option<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  /** Applied to each chip — e.g. flex: 1 for a two-option row that should fill its width. */
  chipStyle?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
  chipStyle,
}: Props<T>) {
  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const thumbX = useRef(new Animated.Value(0)).current;
  const thumbWidth = useRef(new Animated.Value(0)).current;
  const [measured, setMeasured] = useState(false);

  const animateTo = (key: string) => {
    const layout = layouts.current[key];
    if (!layout) return;
    Animated.parallel([
      Animated.timing(thumbX, { toValue: layout.x, duration: 220, useNativeDriver: false }),
      Animated.timing(thumbWidth, { toValue: layout.width, duration: 220, useNativeDriver: false }),
    ]).start();
  };

  useEffect(() => {
    animateTo(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    layouts.current[key] = { x, width };
    if (key === value && !measured) {
      thumbX.setValue(x);
      thumbWidth.setValue(width);
      setMeasured(true);
    }
  };

  return (
    <View style={[styles.track, style]}>
      {measured && (
        <Animated.View
          style={[styles.thumb, { transform: [{ translateX: thumbX }], width: thumbWidth }]}
        />
      )}
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          onLayout={handleLayout(opt.key)}
          style={[styles.chip, chipStyle]}
          onPress={() => onChange(opt.key)}
        >
          <Text style={[styles.chipText, value === opt.key && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    padding: 2,
  },
  thumb: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    alignItems: "center",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.text,
    fontWeight: "600",
  },
});
