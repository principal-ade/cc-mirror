/**
 * Provider Select Screen
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Frame, Divider, HintBar } from '../components/ui/Layout.js';
import { ProviderCard } from '../components/ui/Menu.js';
import { colors, icons } from '../components/ui/theme.js';

interface Provider {
  key: string;
  label: string;
  description: string;
  baseUrl?: string;
  experimental?: boolean;
}

interface ProviderSelectScreenProps {
  providers: Provider[];
  onSelect: (key: string) => void;
}

export const ProviderSelectScreen: React.FC<ProviderSelectScreenProps> = ({
  providers,
  onSelect,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Find next non-experimental provider index
  const findNextSelectable = (current: number, direction: 1 | -1): number => {
    let next = current;
    for (let i = 0; i < providers.length; i++) {
      next = direction === 1
        ? (next < providers.length - 1 ? next + 1 : 0)
        : (next > 0 ? next - 1 : providers.length - 1);
      if (!providers[next]?.experimental) return next;
    }
    return current; // No non-experimental found, stay put
  };

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => findNextSelectable(prev, -1));
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => findNextSelectable(prev, 1));
    }
    if (key.return) {
      const provider = providers[selectedIndex];
      if (provider && !provider.experimental) {
        onSelect(provider.key);
      }
    }
  });

  return (
    <Frame borderColor={colors.borderFocus}>
      <Box marginBottom={1}>
        <Text color={colors.gold} bold>{icons.bullet} </Text>
        <Text color={colors.textBright} bold>Select Provider</Text>
      </Box>
      <Text color={colors.textMuted}>
        Choose an API gateway to power your Claude Code variant
      </Text>

      <Divider color={colors.border} />

      {/* Help text */}
      <Box marginBottom={1}>
        <Text color={colors.textMuted}>
          {icons.star} <Text color={colors.gold}>Zai Cloud</Text> and{' '}
          <Text color={colors.gold}>MiniMax Cloud</Text> are fully supported
        </Text>
        <Text color={colors.textMuted}>
          {icons.bullet} OpenRouter/Local LLMs require model mapping
        </Text>
      </Box>

      <Box flexDirection="column" marginY={1}>
        {providers.map((provider, idx) => (
          <ProviderCard
            key={provider.key}
            provider={provider}
            selected={idx === selectedIndex && !provider.experimental}
            disabled={provider.experimental}
          />
        ))}
      </Box>

      <Divider />
      <HintBar />
    </Frame>
  );
};
