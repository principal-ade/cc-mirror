/**
 * API Key Input Screen
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Frame, Divider, HintBar } from '../components/ui/Layout.js';
import { MaskedInput } from '../components/ui/Input.js';
import { AccentHeader } from '../components/ui/Logo.js';
import { colors, icons, keyHints } from '../components/ui/theme.js';

// Provider-specific help links (full URLs)
const PROVIDER_LINKS: Record<string, { apiKey: string; subscribe: string }> = {
  zai: {
    apiKey: 'https://z.ai/manage-apikey/apikey-list',
    subscribe: 'https://z.ai/subscribe',
  },
  minimax: {
    apiKey: 'https://platform.minimax.io/user-center/payment/coding-plan',
    subscribe: 'https://platform.minimax.io/subscribe/coding-plan',
  },
  openrouter: {
    apiKey: 'https://openrouter.ai/keys',
    subscribe: 'https://openrouter.ai/account',
  },
};

interface ApiKeyScreenProps {
  providerLabel: string;
  providerKey?: string;
  envVarName: string;
  value: string;
  detectedFrom?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export const ApiKeyScreen: React.FC<ApiKeyScreenProps> = ({
  providerLabel,
  providerKey,
  envVarName,
  value,
  detectedFrom,
  onChange,
  onSubmit,
}) => {
  // Get provider-specific links
  const links = providerKey ? PROVIDER_LINKS[providerKey.toLowerCase()] : null;

  return (
    <Frame borderColor={colors.borderGold}>
      <AccentHeader title="API Key" icon={icons.star} />
      <Text color={colors.textMuted}>
        Enter your <Text color={colors.gold}>{providerLabel}</Text> API key
      </Text>

      <Divider color={colors.borderAccent} />

      {/* Help section with links */}
      {links && (
        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text color={colors.gold}>{icons.star} </Text>
            <Text color={colors.text} bold>Need an API key?</Text>
          </Box>
          <Box marginLeft={2} flexDirection="column">
            <Text color={colors.textMuted}>
              1. Subscribe: <Text color={colors.primaryBright}>{links.subscribe}</Text>
            </Text>
            <Text color={colors.textMuted}>
              2. Get key:  <Text color={colors.primaryBright}>{links.apiKey}</Text>
            </Text>
          </Box>
        </Box>
      )}

      {!links && (
        <Box marginBottom={1}>
          <Text color={colors.textMuted}>
            {icons.bullet} Get your API key from your provider's dashboard
          </Text>
        </Box>
      )}

      <Divider color={colors.border} />

      {detectedFrom && (
        <Box marginBottom={1}>
          <Text color={colors.success}>
            {icons.check} Detected in environment: <Text bold>{detectedFrom}</Text>
          </Text>
        </Box>
      )}

      <Box marginY={1}>
        <MaskedInput
          label="Authentication"
          envVarName={envVarName}
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </Box>

      <Divider />
      <HintBar hints={[keyHints.continue, keyHints.back]} />
    </Frame>
  );
};
