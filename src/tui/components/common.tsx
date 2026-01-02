import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export const Header = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Box flexDirection="column" marginBottom={1}>
    <Text color="cyanBright">{title}</Text>
    {subtitle ? <Text dimColor>{subtitle}</Text> : null}
  </Box>
);

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} paddingY={1} marginBottom={1}>
    <Text color="yellow">{title}</Text>
    <Box flexDirection="column" marginTop={1}>
      {children}
    </Box>
  </Box>
);

export const Footer = ({ hint }: { hint: string }) => (
  <Box marginTop={1}>
    <Text dimColor>{hint}</Text>
  </Box>
);

export const InputStep = ({
  label,
  hint,
  value,
  onChange,
  onSubmit,
  mask,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  mask?: string;
}) => (
  <Section title={label}>
    <TextInput value={value} onChange={onChange} onSubmit={onSubmit} mask={mask} />
    {hint ? (
      <Box marginTop={1}>
        <Text dimColor>{hint}</Text>
      </Box>
    ) : null}
  </Section>
);

export const SummaryLine = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Box width={18}>
      <Text color="gray">{label}</Text>
    </Box>
    <Text>{value}</Text>
  </Box>
);
