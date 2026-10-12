import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { TEXTMUNICATION_LOGO_SVG } from "./brand-assets";
import { C, F } from "./ui";

/** The Textmunication wordmark from textmunication.com (215 × 21 viewBox). */
export function TextmunicationLogo({ width = 180 }: { width?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Textmunication">
      <SvgXml xml={TEXTMUNICATION_LOGO_SVG} width={width} height={(width * 21) / 215} />
    </View>
  );
}

/** The official SAM AI wordmark used in the SAM 3.0 workspace header. */
export function SamLogo({ height = 30 }: { height?: number }) {
  return (
    <Image
      source={require("../assets/sam-logo.png")}
      style={{ height, width: height * 4.34 }}
      resizeMode="contain"
      accessible
      accessibilityLabel="SAM AI"
    />
  );
}

/** SAM AI wordmark with the Textmunication byline, for entry screens. */
export function Brand({ compact = false }: { compact?: boolean }) {
  if (compact) return <SamLogo height={26} />;
  return (
    <View style={s.brand} accessible accessibilityLabel="SAM AI by Textmunication">
      <SamLogo height={38} />
      <Text style={s.byline}>by Textmunication</Text>
    </View>
  );
}

const s = StyleSheet.create({
  brand: { alignItems: "flex-start", gap: 6 },
  byline: {
    color: C.muted,
    fontFamily: F.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
