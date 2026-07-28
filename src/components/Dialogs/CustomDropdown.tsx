import React, { useRef, useState } from "react";
import { colors } from "../../theme";
import {
  View,
  TouchableOpacity,
  Text,
  TextInput,
  Modal,
  FlatList,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Dimensions,
  Animated,
} from "react-native";
import { IconChevronDown, IconX } from "../Icons";

interface DropdownItem {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  items: DropdownItem[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  menuItemStyle?: StyleProp<ViewStyle>;
  menuItemTextStyle?: StyleProp<TextStyle>;
  /** Shows a text filter at the top of the opened menu — useful once the
   * list is long enough that scrolling to find one item gets annoying. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Shows an "X" in the closed button (next to the chevron) that clears
   * the selection without opening the menu — for undoing an accidental tap. */
  clearable?: boolean;
}

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MENU_MAX_HEIGHT = 260;

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  items,
  selectedValue,
  onValueChange,
  placeholder = "Sélectionnez",
  buttonStyle,
  textStyle,
  menuItemStyle,
  menuItemTextStyle,
  searchable = false,
  searchPlaceholder = "Rechercher…",
  clearable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ x: 0, y: 0, width: 0, height: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<View>(null);
  const rotation = useRef(new Animated.Value(0)).current;

  const selectedLabel =
    items.find((item) => item.value === selectedValue)?.label || placeholder;

  const visibleItems =
    searchable && searchQuery.trim()
      ? items.filter((item) =>
          item.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        )
      : items;

  const animateChevron = (open: boolean) => {
    Animated.timing(rotation, {
      toValue: open ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const openDropdown = () => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setIsOpen(true);
      animateChevron(true);
    });
  };

  const closeDropdown = () => {
    setIsOpen(false);
    animateChevron(false);
    setSearchQuery("");
  };

  const chevronRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const screenHeight = Dimensions.get("window").height;
  const openUpward = anchor.y + anchor.height + MENU_MAX_HEIGHT > screenHeight;

  return (
    <View ref={containerRef} style={styles.container} collapsable={false}>
      <TouchableOpacity
        style={[styles.button, buttonStyle]}
        onPress={openDropdown}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.buttonText,
            textStyle,
            !selectedValue && { color: colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        {clearable && !!selectedValue && (
          <TouchableOpacity
            onPress={() => onValueChange("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearButton}
          >
            <IconX size={13} color={colors.danger} />
          </TouchableOpacity>
        )}
        <Animated.View style={{ marginLeft: 8, transform: [{ rotate: chevronRotate }] }}>
          <IconChevronDown size={16} color={isOpen ? colors.accent : colors.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={closeDropdown}
        >
          <View
            style={[
              styles.menu,
              {
                left: anchor.x,
                width: anchor.width,
                maxHeight: MENU_MAX_HEIGHT,
              },
              openUpward
                ? { bottom: screenHeight - anchor.y + 6 }
                : { top: anchor.y + anchor.height + 6 },
            ]}
          >
            {searchable && (
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoFocus
              />
            )}
            <FlatList
              style={styles.list}
              data={visibleItems}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const selected = selectedValue === item.value;
                return (
                  <TouchableOpacity
                    style={[styles.menuItem, menuItemStyle, selected && styles.menuItemSelected]}
                    onPress={() => {
                      onValueChange(item.value);
                      closeDropdown();
                    }}
                  >
                    <Text
                      style={[
                        styles.menuItemText,
                        menuItemTextStyle,
                        selected && styles.menuItemTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              scrollEnabled={visibleItems.length > 5}
              nestedScrollEnabled={true}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Aucun résultat</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  button: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: "#f9f8fd",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  backdrop: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECE9F7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  // Without this, the list stretches to fill the menu's maxHeight on web
  // even with one row — flexGrow:0 lets it size to actual content instead.
  list: {
    flexGrow: 0,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0EEF9",
  },
  menuItemSelected: {
    backgroundColor: colors.surface,
  },
  menuItemText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  menuItemTextSelected: {
    fontWeight: "600",
  },
  checkmark: {
    color: colors.text,
    fontWeight: "700",
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
  },
  searchInput: {
    margin: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    fontSize: 12,
    color: colors.text,
  },
  emptyText: {
    padding: 10,
    textAlign: "center",
    fontSize: 12,
    color: colors.textMuted,
  },
});
