/**
 * Completion/Success Screen
 */

import React, { useMemo, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import { Frame, Divider, HintBar } from '../components/ui/Layout.js';
import { Code, SummaryRow } from '../components/ui/Typography.js';
import { SelectMenu } from '../components/ui/Menu.js';
import { colors, icons } from '../components/ui/theme.js';
import type { MenuItem } from '../components/ui/types.js';

interface CompletionScreenProps {
  title: string;
  lines: string[];
  summary?: string[];
  nextSteps?: string[];
  help?: string[];
  variantName?: string;
  wrapperPath?: string;
  configPath?: string;
  variantPath?: string;
  shareUrl?: string;
  shareStatus?: string | null;
  onDone: (value: string) => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  title,
  lines,
  summary,
  nextSteps,
  help,
  variantName,
  wrapperPath,
  configPath,
  variantPath,
  shareUrl,
  shareStatus,
  onDone,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { stdout } = useStdout();

  const wrapText = (text: string, width: number) => {
    if (text.length <= width) return [text];
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > width) {
        if (current) {
          lines.push(current);
          current = word;
        } else {
          lines.push(word.slice(0, width));
          current = word.slice(width);
        }
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const maxWidth = useMemo(() => {
    const columns = stdout?.columns ?? 80;
    return Math.min(columns - 10, 72);
  }, [stdout?.columns]);


  const actions: MenuItem[] = [
    { value: 'home', label: 'Back to Home' },
    ...(shareUrl ? [{ value: 'share', label: 'Share on X', icon: 'star' } as MenuItem] : []),
    { value: 'exit', label: 'Exit', icon: 'exit' },
  ];

  return (
    <Frame borderColor={colors.success}>
      <Box marginBottom={1}>
        <Text color={colors.success} bold>{icons.check} </Text>
        <Text color={colors.gold} bold>Success!</Text>
      </Box>
      <Text color={colors.textMuted}>{variantName ? `Variant "${variantName}" created` : title}</Text>
      {shareStatus && (
        <Box marginTop={1}>
          <Text color={colors.textMuted}>{shareStatus}</Text>
        </Box>
      )}

      <Divider />

      <Box flexDirection="column" marginY={1}>
        {variantName && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color={colors.text}>Run your new variant:</Text>
            <Box marginTop={1} marginLeft={2}>
              <Code>{variantName}</Code>
            </Box>
          </Box>
        )}

        {(wrapperPath || configPath || variantPath) && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={colors.textMuted} bold>Paths:</Text>
            <Box flexDirection="column" marginLeft={2}>
              {wrapperPath && <SummaryRow label="Wrapper" value={wrapperPath} />}
              {configPath && <SummaryRow label="Config" value={configPath} />}
              {variantPath && <SummaryRow label="Root" value={variantPath} />}
            </Box>
          </Box>
        )}

        {summary && summary.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={colors.textMuted} bold>What we did</Text>
            <Box flexDirection="column" marginLeft={2}>
              {summary.flatMap((line, idx) => {
                const wrapped = wrapText(line, maxWidth - 4);
                return wrapped.map((part, partIdx) => (
                  <Text key={`${idx}-${partIdx}`} color={colors.textMuted}>
                    {partIdx === 0 ? `• ${part}` : `  ${part}`}
                  </Text>
                ));
              })}
            </Box>
          </Box>
        )}

        {lines.length > 0 && !lines[0]?.includes('Variant created') && !summary && (
          <Box flexDirection="column" marginTop={1}>
            {lines.flatMap((line, idx) => {
              const wrapped = wrapText(line, maxWidth);
              return wrapped.map((part, partIdx) => (
                <Text key={`${idx}-${partIdx}`} color={colors.textMuted}>{part}</Text>
              ));
            })}
          </Box>
        )}

        {nextSteps && nextSteps.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={colors.textMuted} bold>Next steps</Text>
            <Box flexDirection="column" marginLeft={2}>
              {nextSteps.flatMap((line, idx) => {
                const wrapped = wrapText(line, maxWidth - 4);
                return wrapped.map((part, partIdx) => (
                  <Text key={`${idx}-${partIdx}`} color={colors.textMuted}>
                    {partIdx === 0 ? `• ${part}` : `  ${part}`}
                  </Text>
                ));
              })}
            </Box>
          </Box>
        )}

        {help && help.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={colors.textMuted} bold>Help</Text>
            <Box flexDirection="column" marginLeft={2}>
              {help.flatMap((line, idx) => {
                const wrapped = wrapText(line, maxWidth - 4);
                return wrapped.map((part, partIdx) => (
                  <Text key={`${idx}-${partIdx}`} color={colors.textMuted}>
                    {partIdx === 0 ? `• ${part}` : `  ${part}`}
                  </Text>
                ));
              })}
            </Box>
          </Box>
        )}
      </Box>

      <Divider />

      <Box marginY={1}>
        <SelectMenu
          items={actions}
          selectedIndex={selectedIndex}
          onIndexChange={setSelectedIndex}
          onSelect={onDone}
        />
      </Box>

      <HintBar />
    </Frame>
  );
};
