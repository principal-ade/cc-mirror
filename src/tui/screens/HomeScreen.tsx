/**
 * Home Screen - Main menu for CC-MIRROR
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Frame, Divider, HintBar } from '../components/ui/Layout.js';
import { SelectMenu } from '../components/ui/Menu.js';
import { LogoBanner, GoldDivider } from '../components/ui/Logo.js';
import { colors } from '../components/ui/theme.js';
import type { MenuItem } from '../components/ui/types.js';

interface HomeScreenProps {
  onSelect: (value: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelect }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: MenuItem[] = [
    { value: 'quick', label: 'Quick Setup', description: 'Provider + API key → Ready in 30s', icon: 'star' },
    { value: 'create', label: 'New Variant', description: 'Full configuration wizard' },
    { value: 'manage', label: 'Manage Variants', description: 'Update, remove, or inspect' },
    { value: 'updateAll', label: 'Update All', description: 'Sync all variants to latest' },
    { value: 'doctor', label: 'Diagnostics', description: 'Health check all variants' },
    { value: 'settings', label: 'Settings', description: 'Configure default paths' },
    { value: 'exit', label: 'Exit', icon: 'exit' },
  ];

  return (
    <Frame borderColor={colors.borderFocus}>
      {/* ASCII Art Banner */}
      <LogoBanner />

      <Box marginY={1}>
        <GoldDivider width={66} />
      </Box>

      <Box marginY={1}>
        <SelectMenu
          items={items}
          selectedIndex={selectedIndex}
          onIndexChange={setSelectedIndex}
          onSelect={onSelect}
        />
      </Box>

      <Box marginY={1}>
        <Box flexDirection="column">
          <Text color={colors.textMuted}>Quick Setup defaults to maximal prompt packs.</Text>
          <Text color={colors.textMuted}>Z.ai also writes Z_AI_API_KEY to your shell profile (opt out in Advanced).</Text>
        </Box>
      </Box>

      <Divider />
      <HintBar />
    </Frame>
  );
};
