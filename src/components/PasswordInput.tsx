/**
 * TextInput with a show/hide toggle (the "eye" icon) for password fields.
 * Wraps whatever input style the caller already uses — just adds room on
 * the right for the icon.
 */
import { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { IconEye, IconEyeOff } from "./Icons";
import { colors } from "../theme";

interface Props extends Omit<TextInputProps, "secureTextEntry" | "style"> {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  iconSize?: number;
}

export function PasswordInput({ containerStyle, inputStyle, iconSize = 18, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  const hasValue = !!rest.value;

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[inputStyle, styles.input]}
        secureTextEntry={!visible || !hasValue}
        {...rest}
      />
      {hasValue && (
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.5}
          style={styles.toggle}
        >
          {visible ? (
            <IconEyeOff size={iconSize} color={colors.text} />
          ) : (
            <IconEye size={iconSize} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
  },
  input: {
    paddingRight: 40,
  },
  toggle: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
});
