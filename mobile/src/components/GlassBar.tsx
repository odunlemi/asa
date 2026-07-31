import React from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { tokens } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  edge: 'top' | 'bottom';
  style?: ViewStyle;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Translucent bar that content scrolls underneath. `dimezisBlurView` is the only
 * Android method that samples the view behind it; iOS uses the native blur.
 */
export function GlassBar({ children, edge, style, onLayout }: Props) {
  return (
    <View
      onLayout={onLayout}
      style={[styles.bar, edge === 'top' ? styles.top : styles.bottom, style]}
    >
      <BlurView
        intensity={38}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.fill} />
      </BlurView>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  top: {
    top: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.glassHairline,
  },
  bottom: {
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.glassHairline,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.glassFill,
  },
});
