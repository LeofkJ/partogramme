import React, { useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  FlatList,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Dimensions,
  Animated,
} from "react-native";
import { IconChevronDown } from "../Icons";

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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<View>(null);
  const rotation = useRef(new Animated.Value(0)).current;

  const selectedLabel =
    items.find((item) => item.value === selectedValue)?.label || placeholder;

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
            !selectedValue && { color: "#9F90D4" },
          ]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <Animated.View style={{ marginLeft: 8, transform: [{ rotate: chevronRotate }] }}>
          <IconChevronDown size={16} color={isOpen ? "#403572" : "#9F90D4"} />
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
            <FlatList
              data={items}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const selected = selectedValue === item.value;
                return (
                  <TouchableOpacity
                    style={[styles.menuItem, selected && styles.menuItemSelected]}
                    onPress={() => {
                      onValueChange(item.value);
                      closeDropdown();
                    }}
                  >
                    <Text
                      style={[styles.menuItemText, selected && styles.menuItemTextSelected]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              scrollEnabled={items.length > 5}
              nestedScrollEnabled={true}
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
    borderColor: "#9F90D4",
    borderRadius: 12,
    backgroundColor: "#f9f8fd",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#403572",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonText: {
    flex: 1,
    fontSize: 15,
    color: "#403572",
    fontWeight: "500",
  },
  backdrop: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    backgroundColor: "#ffffff",
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
    backgroundColor: "#f5f3fc",
  },
  menuItemText: {
    fontSize: 15,
    color: "#403572",
    flex: 1,
  },
  menuItemTextSelected: {
    fontWeight: "600",
  },
  checkmark: {
    color: "#403572",
    fontWeight: "700",
    marginLeft: 8,
  },
});
