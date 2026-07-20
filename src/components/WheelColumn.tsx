import React, { useEffect, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
export const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

const clampIndex = (index: number, length: number) => Math.max(0, Math.min(length - 1, index));

/** A single scrollable, snapping wheel column (day / month / year), swapped
 * in for the calendar grid's square day cells. The highlighted value tracks
 * the scroll position live (not just after it settles), so it actually
 * follows your finger instead of jumping at the end. */
export const WheelColumn: React.FC<WheelColumnProps> = ({ items, selectedIndex, onChange }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [liveIndex, setLiveIndex] = useState(selectedIndex);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Jump to the right spot on open / when the parent resets the value
  // (e.g. switching month changes which day was selected).
  useEffect(() => {
    setLiveIndex(selectedIndex);
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  // Mouse-wheel/trackpad scrolling on web never fires a native "momentum
  // ended" event the way a touch fling does, so committing only on
  // onMomentumScrollEnd left web never landing on a value. Instead, treat
  // "no scroll events for a beat" as settled — that works the same on both.
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = clampIndex(Math.round(offsetY / ITEM_HEIGHT), items.length);
    setLiveIndex(index);

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => onChange(index), 120);
  };

  return (
    <View style={styles.column}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="normal"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentContainerStyle={{ paddingVertical: PADDING }}
      >
        {items.map((item, index) => (
          <View key={index} style={styles.item}>
            <Text style={[styles.itemText, index === liveIndex && styles.itemTextActive]}>
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    flex: 1,
    height: WHEEL_HEIGHT,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  itemTextActive: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
});
