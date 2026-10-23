import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
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
  type ScrollViewInstance,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Design tokens taken from the SAM 3.0 workspace (sam3.txhd.io) and
 * textmunication.com, inspected October 12, 2026: SAM blue controls, pink
 * outline actions, slate text and borders, white cards on a cool gray page.
 */
export const C = {
  bg: "#F8FAFC",
  white: "#FFFFFF",
  ink: "#020817",
  text: "#334155",
  muted: "#64748B",
  faint: "#94A3B8",
  primary: "#1785CF",
  primaryDark: "#136FAE",
  primarySoft: "#E8F3FB",
  primaryBorder: "#B9DCF2",
  accent: "#CF1785",
  accentSoft: "#FBE7F2",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  green: "#16A34A",
  greenSoft: "#DCFCE7",
  amber: "#D97706",
  amberSoft: "#FEF3C7",
  red: "#DC2626",
  redSoft: "#FEE2E2",
  navy: "#0F172A",
  // Kept for existing call sites: the soft blue tint used behind icons.
  lilac: "#E8F3FB",
} as const;

/** Inter is the textmunication.com typeface; each weight is its own family. */
export const F = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const R = { sm: 8, md: 10, lg: 14, xl: 20, pill: 999 } as const;

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

type ButtonVariant =
  | "primary"
  | "outline"
  | "outlinePrimary"
  | "accent"
  | "ghost"
  | "danger"
  | "secondary";

const buttonColors: Record<
  ButtonVariant,
  { background: string; border: string; foreground: string }
> = {
  primary: { background: C.primary, border: C.primary, foreground: C.white },
  outline: { background: C.white, border: C.borderStrong, foreground: C.ink },
  outlinePrimary: {
    background: C.white,
    border: C.primary,
    foreground: C.primary,
  },
  accent: { background: C.white, border: C.accent, foreground: C.accent },
  ghost: { background: "transparent", border: "transparent", foreground: C.primary },
  danger: { background: C.white, border: C.red, foreground: C.red },
  // Alias kept for older call sites.
  secondary: { background: C.white, border: C.borderStrong, foreground: C.ink },
};

export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  disabled = false,
  compact = false,
  size = "md",
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Hug the content instead of filling the row. */
  compact?: boolean;
  size?: "md" | "sm";
  style?: StyleProp<ViewStyle>;
}) {
  const colors = buttonColors[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        s.button,
        size === "sm" && s.buttonSmall,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        compact && s.buttonCompact,
        pressed && s.pressed,
        disabled && s.disabled,
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={size === "sm" ? 15 : 17} color={colors.foreground} />
      ) : null}
      <Text
        style={[
          s.buttonText,
          size === "sm" && s.buttonTextSmall,
          { color: colors.foreground },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const badgeTones = {
  blue: { backgroundColor: C.primarySoft, color: C.primaryDark },
  purple: { backgroundColor: C.primarySoft, color: C.primaryDark },
  green: { backgroundColor: C.greenSoft, color: "#15803D" },
  amber: { backgroundColor: C.amberSoft, color: "#B45309" },
  gray: { backgroundColor: "#F1F5F9", color: C.muted },
  pink: { backgroundColor: C.accentSoft, color: C.accent },
  red: { backgroundColor: C.redSoft, color: "#B91C1C" },
};

export function Badge({
  label,
  tone = "blue",
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

/** The SAM dashboard statistic tile: label, large value, caption, optional action. */
export function StatCard({
  label,
  value,
  caption,
  action,
  onAction,
  style,
}: {
  label: string;
  value: string | number;
  caption?: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.card, s.stat, style]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {caption ? <Text style={s.statCaption}>{caption}</Text> : null}
      {action && onAction ? (
        <View style={s.statAction}>
          <Button
            title={action}
            onPress={onAction}
            variant="accent"
            size="sm"
            compact
          />
        </View>
      ) : null}
    </View>
  );
}

/** Page title and subtitle in the SAM layout, with an optional action row. */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={s.pageHeader}>
      <View style={s.pageHeading}>
        <Text accessibilityRole="header" style={t.h1}>
          {title}
        </Text>
        {subtitle ? <Text style={t.help}>{subtitle}</Text> : null}
      </View>
      {children ? <View style={s.pageActions}>{children}</View> : null}
    </View>
  );
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
      <Text accessibilityRole="header" style={[t.h2, ui.grow]}>
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
          <Icon name="chevron-right" size={16} color={C.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Input({
  label,
  required = false,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  maxLength,
  inputMode,
  autoCapitalize,
  autoCorrect,
  secureTextEntry = false,
  accessibilityLabel,
  help,
  error,
  onSubmitEditing,
  returnKeyType,
  style,
}: {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  maxLength?: number;
  inputMode?: React.ComponentProps<typeof TextInput>["inputMode"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  accessibilityLabel?: string;
  help?: string;
  error?: string;
  onSubmitEditing?: () => void;
  returnKeyType?: React.ComponentProps<typeof TextInput>["returnKeyType"];
  style?: StyleProp<TextStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const secure = secureTextEntry && !revealed;
  return (
    <View style={s.field}>
      {label ? (
        <Text style={s.label}>
          {label}
          {required ? <Text style={s.required}> *</Text> : null}
        </Text>
      ) : null}
      <View style={s.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.faint}
          accessibilityLabel={
            accessibilityLabel || label || placeholder || "Text input"
          }
          multiline={multiline}
          maxLength={maxLength}
          inputMode={inputMode}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secure}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            s.input,
            multiline && s.multilineInput,
            secureTextEntry && s.secureInput,
            focused && s.inputFocused,
            !!error && s.inputError,
            style,
          ]}
          selectionColor={C.primary}
          textAlignVertical={multiline ? "top" : "center"}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed(!revealed)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            style={({ pressed }) => [s.reveal, pressed && s.pressed]}
          >
            <Icon name={revealed ? "eye-off" : "eye"} size={18} color={C.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={t.error}>
          {error}
        </Text>
      ) : help ? (
        <Text style={t.small}>{help}</Text>
      ) : null}
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
      <Icon name="search" size={18} color={C.faint} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
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
          <Icon name="x" size={17} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chips({
  options,
  value,
  onChange,
  counts,
}: {
  options: string[];
  value: string;
  onChange: (option: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chips}
    >
      {options.map((option) => {
        const selected = value === option;
        const count = counts?.[option];
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityLabel={
              count === undefined ? option : `${option}, ${count}`
            }
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
            {count !== undefined ? (
              <View style={[s.chipCount, selected && s.selectedChipCount]}>
                <Text
                  style={[s.chipCountText, selected && s.selectedChipCountText]}
                >
                  {count}
                </Text>
              </View>
            ) : null}
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
  actionIcon,
}: {
  title: string;
  body: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
  actionIcon?: IconName;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} color={C.primary} size={26} />
      </View>
      <Text style={[t.h3, s.centerText]}>{title}</Text>
      <Text style={[t.help, s.emptyBody]}>{body}</Text>
      {action && onAction ? (
        <Button
          title={action}
          onPress={onAction}
          icon={actionIcon}
          compact
          variant="outlinePrimary"
        />
      ) : null}
    </View>
  );
}

/** A tappable list row with a leading element, title, subtitle, and trailing content. */
export function Row({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  chevron = true,
  first = false,
}: {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  chevron?: boolean;
  first?: boolean;
}) {
  const content = (
    <>
      {leading ? <View style={s.rowLeading}>{leading}</View> : null}
      <View style={ui.grow}>
        <Text style={s.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={t.small} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress && chevron ? (
        <Icon name="chevron-right" size={18} color={C.faint} />
      ) : null}
    </>
  );
  if (!onPress)
    return <View style={[s.row, !first && s.rowDivider]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        !first && s.rowDivider,
        pressed && s.rowPressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function ProgressBar({
  value,
  max,
  color = C.primary,
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <View
      style={s.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: value }}
    >
      <View
        style={[
          s.progressFill,
          { width: `${ratio * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

export function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[s.radio, selected && s.radioSelected]}>
      {selected && <View style={s.radioDot} />}
    </View>
  );
}

export function Checkbox({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={({ pressed }) => [s.checkRow, pressed && s.pressed]}
    >
      <View style={[s.checkbox, checked && s.checked]}>
        {checked ? <Icon name="check" size={14} color={C.white} /> : null}
      </View>
      <Text style={[t.body, ui.grow]}>{label}</Text>
    </Pressable>
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
  const scroll = useRef<ScrollViewInstance>(null);
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
      animationType={desktop ? "fade" : "slide"}
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
              <Text accessibilityRole="header" style={t.h2}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={[t.help, s.sheetSubtitle]}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
              style={({ pressed }) => [s.closeButton, pressed && s.pressed]}
            >
              <Icon name="x" size={20} color={C.ink} />
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

export function Avatar({
  name,
  size = 44,
  tone = "blue",
}: {
  name: string;
  size?: number;
  tone?: "blue" | "gray";
}) {
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
        tone === "gray" && s.avatarGray,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      accessible={false}
    >
      <Text
        style={[
          s.avatarText,
          tone === "gray" && { color: C.muted },
          { fontSize: Math.max(13, size * 0.36) },
        ]}
      >
        {initials || "?"}
      </Text>
    </View>
  );
}

/** Typography presets. Every text style sets an Inter family explicitly. */
export const t = StyleSheet.create({
  display: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
  },
  h1: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.6,
  },
  h2: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  h3: { color: C.ink, fontFamily: F.semibold, fontSize: 16, lineHeight: 22 },
  body: { color: C.ink, fontFamily: F.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: {
    color: C.ink,
    fontFamily: F.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  help: { color: C.muted, fontFamily: F.regular, fontSize: 14, lineHeight: 20 },
  small: { color: C.muted, fontFamily: F.regular, fontSize: 12, lineHeight: 17 },
  label: { color: C.ink, fontFamily: F.semibold, fontSize: 13, lineHeight: 18 },
  eyebrow: {
    color: C.muted,
    fontFamily: F.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  link: { color: C.primary, fontFamily: F.semibold, fontSize: 14, lineHeight: 20 },
  error: { color: C.red, fontFamily: F.regular, fontSize: 13, lineHeight: 18 },
});

export const ui = StyleSheet.create({
  h1: t.h1,
  h2: t.h2,
  body: t.body,
  muted: { color: C.muted },
  eyebrow: t.eyebrow,
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  grow: { flex: 1, minWidth: 0 },
  stack: { gap: 14 },
  help: t.help,
  error: t.error,
  notice: {
    color: "#15803D",
    backgroundColor: C.greenSoft,
    fontFamily: F.medium,
    padding: 12,
    borderRadius: R.md,
    fontSize: 14,
    lineHeight: 20,
  },
});

const s = StyleSheet.create({
  button: {
    minHeight: 46,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: R.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
  },
  buttonSmall: { minHeight: 36, paddingVertical: 7, paddingHorizontal: 13 },
  buttonCompact: { alignSelf: "flex-start" },
  buttonText: {
    fontFamily: F.semibold,
    fontSize: 15,
    lineHeight: 20,
    flexShrink: 1,
    textAlign: "center",
  },
  buttonTextSmall: { fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: R.pill,
  },
  badgeText: { fontFamily: F.semibold, fontSize: 11, lineHeight: 16 },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.lg,
    padding: 18,
  },
  stat: { gap: 4, padding: 16 },
  statLabel: { color: C.muted, fontFamily: F.medium, fontSize: 13, lineHeight: 18 },
  statValue: {
    color: C.ink,
    fontFamily: F.bold,
    fontSize: 26,
    lineHeight: 32,
    marginTop: 2,
  },
  statCaption: { color: C.muted, fontFamily: F.regular, fontSize: 12, lineHeight: 16 },
  statAction: { marginTop: 8 },
  pageHeader: { gap: 14 },
  pageHeading: { gap: 5 },
  pageActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  section: { minHeight: 40 },
  sectionAction: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 8,
  },
  actionText: t.link,
  field: { gap: 7 },
  label: t.label,
  required: { color: C.red },
  inputWrap: { position: "relative" },
  input: {
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: R.md,
    minHeight: 46,
    paddingVertical: 11,
    paddingHorizontal: 13,
    fontFamily: F.regular,
    fontSize: 15,
    lineHeight: 20,
    color: C.ink,
  },
  secureInput: { paddingRight: 46 },
  inputFocused: { borderColor: C.primary },
  inputError: { borderColor: C.red },
  multilineInput: { minHeight: 132 },
  reveal: {
    position: "absolute",
    right: 2,
    top: 2,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    minHeight: 46,
    paddingLeft: 12,
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    color: C.ink,
    fontFamily: F.regular,
    fontSize: 14,
    paddingVertical: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { gap: 8, paddingVertical: 2, alignItems: "center" },
  chip: {
    minHeight: 38,
    borderRadius: R.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  selectedChip: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.text, fontFamily: F.medium, fontSize: 13, lineHeight: 18 },
  selectedChipText: { color: C.white },
  chipCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    borderRadius: R.pill,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  selectedChipCount: { backgroundColor: "rgba(255,255,255,0.22)" },
  chipCountText: { color: C.muted, fontFamily: F.semibold, fontSize: 11, lineHeight: 16 },
  selectedChipCountText: { color: C.white },
  empty: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyIcon: {
    height: 58,
    width: 58,
    borderRadius: R.lg,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  centerText: { textAlign: "center" },
  emptyBody: { maxWidth: 320, textAlign: "center", marginBottom: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: C.border },
  rowPressed: { backgroundColor: C.bg },
  rowLeading: { width: 40, alignItems: "center" },
  rowTitle: { color: C.ink, fontFamily: F.semibold, fontSize: 15, lineHeight: 21 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: { height: 8, borderRadius: 4 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: C.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
  },
  checkRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checked: { backgroundColor: C.primary, borderColor: C.primary },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(2,8,23,0.45)",
    justifyContent: "flex-end",
  },
  desktopModal: { alignItems: "center", justifyContent: "center", padding: 28 },
  sheet: {
    backgroundColor: C.white,
    maxHeight: "94%",
    width: "100%",
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    overflow: "hidden",
  },
  desktopSheet: { maxWidth: 560, borderRadius: R.lg, maxHeight: "92%" },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderStrong,
    marginTop: 10,
    alignSelf: "center",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingLeft: 22,
    paddingRight: 14,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetSubtitle: { marginTop: 4 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: { padding: 22, gap: 18 },
  avatar: {
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGray: { backgroundColor: "#F1F5F9" },
  avatarText: { fontFamily: F.bold, color: C.primaryDark },
});
