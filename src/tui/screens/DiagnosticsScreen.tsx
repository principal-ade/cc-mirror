/**
 * Diagnostics/Doctor Screen
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Frame, Divider, Section, HintBar } from '../components/ui/Layout.js';
import { HealthCheck } from '../components/ui/Progress.js';
import { colors, icons, keyHints } from '../components/ui/theme.js';

interface HealthCheckItem {
  name: string;
  ok: boolean;
  details?: {
    binary: boolean;
    wrapper: boolean;
    config: boolean;
  };
}

interface DiagnosticsScreenProps {
  report: HealthCheckItem[];
  onDone: () => void;
}

export const DiagnosticsScreen: React.FC<DiagnosticsScreenProps> = ({
  report,
  onDone,
}) => {
  useInput((input, key) => {
    if (key.return || key.escape) {
      onDone();
    }
  });

  const healthyCount = report.filter((r) => r.ok).length;
  const issueCount = report.length - healthyCount;

  // Border color based on health status
  const borderColor = issueCount > 0 ? colors.warning : colors.success;

  return (
    <Frame borderColor={borderColor}>
      <Box marginBottom={1}>
        <Text color={colors.gold} bold>{icons.bullet} </Text>
        <Text color={colors.textBright} bold>Diagnostics</Text>
      </Box>
      <Text color={colors.textMuted}>Health check results</Text>

      <Divider />

      <Box flexDirection="column" marginY={1}>
        {report.length === 0 ? (
          <Text color={colors.textMuted}>No variants found.</Text>
        ) : (
          report.map((item) => (
            <HealthCheck
              key={item.name}
              name={item.name}
              ok={item.ok}
              details={item.details}
            />
          ))
        )}
      </Box>

      <Divider />

      <Section>
        <Box>
          <Text color={colors.textMuted}>
            Total: {report.length}
          </Text>
          <Text color={colors.textMuted}> | </Text>
          <Text color={colors.success}>Healthy: {healthyCount}</Text>
          <Text color={colors.textMuted}> | </Text>
          <Text color={issueCount > 0 ? colors.warning : colors.textMuted}>
            Issues: {issueCount}
          </Text>
        </Box>
      </Section>

      <Divider />
      <HintBar hints={[keyHints.select + ' Back to Home']} />
    </Frame>
  );
};
