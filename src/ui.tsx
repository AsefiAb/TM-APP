import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const C = {
  bg: "#F7F9FC",
  white: "#FFFFFF",
  ink: "#1A202C",
  muted: "#667085",
  primary: "#086CA8",
  accent: "#168BD1",
  border: "#DFE5ED",
  lilac: "#EAF4FB",
  green: "#207B61",
} as const;

export type IconName = React.ComponentProps<typeof Feather>["name"];

export function Icon({
  name,
  color = C.muted,
  size = 20,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <Feather name={name} color={color} size={size} accessible={false} />;
}

export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}) {
  const foreground = variant === "primary" ? C.white : C.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        s.button,
        variant === "secondary" && s.secondaryButton,
        variant === "ghost" && s.ghostButton,
        pressed && s.pressed,
        disabled && s.disabled,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={foreground} /> : null}
      <Text style={[s.buttonText, { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}

const badgeTones = {
  purple: { backgroundColor: C.lilac, color: C.primary },
  green: { backgroundColor: "#E7F5EE", color: "#22684F" },
  amber: { backgroundColor: "#FFF3DA", color: "#8C5915" },
  gray: { backgroundColor: "#F0F2F5", color: "#586273" },
};

export function Badge({
  label,
  tone = "purple",
}: {
  label: string;
  tone?: keyof typeof badgeTones;
}) {
  const colors = badgeTones[tone];
  return (
    <View style={[s.badge, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[s.badgeText, { color: colors.color }]}>{label}</Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Section({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[ui.between, s.section]}>
      <Text accessibilityRole="header" style={[ui.h2, ui.grow]}>
        {title}
      </Text>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          onPress={onAction}
          style={({ pressed }) => [s.sectionAction, pressed && s.pressed]}
        >
          <Text style={s.actionText}>{action}</Text>
          <Icon name="arrow-up-right" size={15} color={C.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  maxLength,
  inputMode,
  autoCapitalize,
  autoCorrect,
  accessibilityLabel,
  style,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  maxLength?: number;
  inputMode?: React.ComponentProps<typeof TextInput>["inputMode"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  autoCorrect?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        accessibilityLabel={
          accessibilityLabel || label || placeholder || "Text input"
        }
        multiline={multiline}
        maxLength={maxLength}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          s.input,
          multiline && s.multilineInput,
          focused && s.inputFocused,
          style,
        ]}
        selectionColor={C.primary}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

export function Search({
  value,
  onChange,
  placeholder = "Search",
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.search, focused && s.inputFocused]}>
      <Icon name="search" size={19} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={C.primary}
        returnKeyType="search"
        style={s.searchInput}
      />
      {value ? (
        <Pressable
          onPress={() => onChange("")}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={({ pressed }) => [s.iconButton, pressed && s.pressed]}
        >
          <Icon name="x" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (option: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chips}
    >
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityLabel={option}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              s.chip,
              selected && s.selectedChip,
              pressed && s.pressed,
            ]}
          >
            <Text style={[s.chipText, selected && s.selectedChipText]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Empty({
  title,
  body,
  icon = "inbox",
  action,
  onAction,
}: {
  title: string;
  body: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} color={C.primary} size={26} />
      </View>
      <Text style={[ui.h2, s.centerText]}>{title}</Text>
      <Text style={[ui.body, ui.muted, s.emptyBody]}>{body}</Text>
      {action && onAction ? <Button title={action} onPress={onAction} /> : null}
    </View>
  );
}

const SheetScrollContext = createContext<() => void>(() => {});

export function useSheetScroll() {
  return useContext(SheetScrollContext);
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
  subtitle,
  scrollKey,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  subtitle?: string;
  scrollKey?: string | number;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 700;
  const scroll = useRef<ScrollView>(null);
  const resetScroll = useCallback(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, []);
  useEffect(() => {
    resetScroll();
  }, [scrollKey, visible, resetScroll]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          s.modalRoot,
          { paddingTop: Math.max(insets.top, 24) },
          desktop && s.desktopModal,
        ]}
      >
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          accessible={false}
          importantForAccessibility="no"
        />
        <View
          accessibilityViewIsModal
          style={[
            s.sheet,
            desktop && s.desktopSheet,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {!desktop ? <View style={s.sheetHandle} /> : null}
          <View style={s.sheetHeader}>
            <View style={ui.grow}>
              <Text accessibilityRole="header" style={ui.h2}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={[ui.help, s.sheetSubtitle]}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
              style={({ pressed }) => [s.closeButton, pressed && s.pressed]}
            >
              <Icon name="x" size={21} color={C.ink} />
            </Pressable>
          </View>
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.sheetContent}
          >
            <SheetScrollContext.Provider value={resetScroll}>
              {children}
            </SheetScrollContext.Provider>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <View
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size * 0.35 },
      ]}
      accessible={false}
    >
      <Text style={[s.avatarText, { fontSize: Math.max(14, size * 0.32) }]}>
        {initials || "?"}
      </Text>
    </View>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View
      style={s.brand}
      accessible
      accessibilityLabel="SAM AI by Textmunication"
    >
      <Image
        source={require("../assets/sam-logo.png")}
        style={[s.brandImage, compact && s.compactBrandImage]}
        resizeMode="contain"
        accessible={false}
      />
      {!compact ? <Text style={s.brandByline}>by Textmunication</Text> : null}
    </View>
  );
}

export const ui = StyleSheet.create({
  h1: {
    color: C.ink,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -1.1,
  },
  h2: {
    color: C.ink,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.35,
  },
  body: { color: C.ink, fontSize: 15, lineHeight: 23 },
  muted: { color: C.muted },
  eyebrow: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 1.7,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  grow: { flex: 1, minWidth: 0 },
  stack: { gap: 14 },
  help: { color: C.muted, fontSize: 14, lineHeight: 21 },
  error: { color: "#AC314F", fontSize: 14, lineHeight: 21 },
});

const s = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 9,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: C.primary,
  },
  secondaryButton: { backgroundColor: C.white, borderColor: C.border },
  ghostButton: { backgroundColor: "transparent", borderColor: "transparent" },
  buttonText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 20,
  },
  section: { minHeight: 44 },
  sectionAction: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingLeft: 8,
  },
  actionText: {
    color: C.primary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  field: { gap: 8 },
  label: { color: C.ink, fontSize: 14, lineHeight: 21, fontWeight: "600" },
  input: {
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 9,
    minHeight: 50,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    lineHeight: 23,
    color: C.ink,
  },
  inputFocused: { borderColor: C.primary },
  multilineInput: { minHeight: 138 },
  search: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    minHeight: 50,
    paddingLeft: 14,
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    color: C.ink,
    fontSize: 14,
    paddingVertical: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { gap: 8, paddingVertical: 2, alignItems: "center" },
  chip: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    justifyContent: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  selectedChip: { backgroundColor: C.lilac, borderColor: "#B9DAF1" },
  chipText: { color: C.muted, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  selectedChipText: { color: C.primary },
  empty: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyIcon: {
    height: 62,
    width: 62,
    borderRadius: 16,
    backgroundColor: C.lilac,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  centerText: { textAlign: "center" },
  emptyBody: { maxWidth: 330, textAlign: "center", marginBottom: 8 },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(26,32,44,0.42)",
    justifyContent: "flex-end",
  },
  desktopModal: { alignItems: "center", justifyContent: "center", padding: 28 },
  sheet: {
    backgroundColor: C.white,
    maxHeight: "94%",
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  desktopSheet: { maxWidth: 560, borderRadius: 16, maxHeight: "92%" },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginTop: 10,
    alignSelf: "center",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingLeft: 24,
    paddingRight: 16,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetSubtitle: { marginTop: 5 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: { padding: 24, gap: 20 },
  avatar: {
    backgroundColor: C.lilac,
    borderWidth: 1,
    borderColor: "#CDE4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "700", color: C.primary },
  brand: { alignItems: "flex-start", gap: 5 },
  brandImage: { width: 152, height: 35 },
  compactBrandImage: { width: 118, height: 28 },
  brandByline: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
});
