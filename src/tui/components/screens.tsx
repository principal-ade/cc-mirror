import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import type { ProviderTemplate, ProviderEnv } from '../../providers/index.js';
import type { VariantMeta } from '../../core/types.js';
import { Footer, Header, InputStep, Section, SummaryLine } from './common.js';

export const Home = ({ onSelect }: { onSelect: (value: string) => void }) => (
  <Box flexDirection="column">
    <Header title="cc-mirror" subtitle="Create, manage, and update multiple Claude Code variants" />
    <Section title="Main Menu">
      <SelectInput
        items={[
          { label: 'Quick setup (npm + defaults)', value: 'quick' },
          { label: 'Create new variant', value: 'create' },
          { label: 'Manage existing variants', value: 'manage' },
          { label: 'Update all variants', value: 'updateAll' },
          { label: 'Doctor / sanity check', value: 'doctor' },
          { label: 'Settings (paths)', value: 'settings' },
          { label: 'Exit', value: 'exit' },
        ]}
        onSelect={item => onSelect(item.value)}
      />
    </Section>
    <Footer hint="Use arrow keys to navigate, Enter to select." />
  </Box>
);

export const ProviderSelect = ({
  providersList,
  onSelect,
}: {
  providersList: ProviderTemplate[];
  onSelect: (value: string) => void;
}) => (
  <Box flexDirection="column">
    <Header title="Choose a provider template" subtitle="Each template ships with sane defaults and model mappings." />
    <Section title="Providers">
      <SelectInput
        items={providersList.map(provider => ({
          label: `${provider.label} - ${provider.description}`,
          value: provider.key,
        }))}
        onSelect={item => onSelect(item.value)}
      />
    </Section>
    <Footer hint="Pick a template or press Esc to go back." />
  </Box>
);

export const YesNoSelect = ({
  title,
  onSelect,
  yesLabel = 'Yes',
  noLabel = 'No',
}: {
  title: string;
  onSelect: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}) => (
  <Section title={title}>
    <SelectInput
      items={[
        { label: yesLabel, value: true },
        { label: noLabel, value: false },
      ]}
      onSelect={item => onSelect(item.value)}
    />
  </Section>
);

export const EnvEditor = ({
  envEntries,
  onAdd,
  onDone,
}: {
  envEntries: string[];
  onAdd: (entry: string) => void;
  onDone: () => void;
}) => {
  const [entry, setEntry] = useState('');

  return (
    <Box flexDirection="column">
      <Header title="Extra environment variables" subtitle="Add KEY=VALUE lines. Leave blank to continue." />
      <Section title="Current additions">
        {envEntries.length === 0 ? <Text dimColor>None</Text> : envEntries.map(item => <Text key={item}>{item}</Text>)}
      </Section>
      <InputStep
        label="Add env entry"
        hint="Format: KEY=VALUE"
        value={entry}
        onChange={setEntry}
        onSubmit={value => {
          const trimmed = value.trim();
          if (!trimmed) {
            onDone();
            return;
          }
          onAdd(trimmed);
          setEntry('');
        }}
      />
      <Footer hint="Press Enter on an empty line to finish." />
    </Box>
  );
};

export const Summary = ({
  data,
  envPreview,
  onConfirm,
  onBack,
  onCancel,
}: {
  data: {
    name: string;
    providerLabel: string;
    brandLabel: string;
    baseUrl: string;
    apiKey: string;
    rootDir: string;
    binDir: string;
    npmPackage: string;
    npmVersion: string;
    useTweak: boolean;
  };
  envPreview: string[];
  onConfirm: () => void;
  onBack: () => void;
  onCancel: () => void;
}) => (
  <Box flexDirection="column">
    <Header title="Review your variant" subtitle="Everything below will be written to disk." />
    <Section title="Core settings">
      <SummaryLine label="Variant" value={data.name} />
      <SummaryLine label="Provider" value={data.providerLabel} />
      <SummaryLine label="Brand preset" value={data.brandLabel} />
      <SummaryLine label="Base URL" value={data.baseUrl || '(none)'} />
      <SummaryLine label="API key" value={data.apiKey ? '*** (set)' : '(placeholder)'} />
      <SummaryLine label="Root" value={data.rootDir} />
      <SummaryLine label="Bin dir" value={data.binDir} />
      <SummaryLine label="NPM package" value={data.npmPackage} />
      <SummaryLine label="NPM version" value={data.npmVersion} />
      <SummaryLine label="Use tweakcc" value={data.useTweak ? 'Yes' : 'No'} />
    </Section>
    <Section title="Environment preview">
      {envPreview.length === 0 ? <Text dimColor>(none)</Text> : envPreview.map(item => <Text key={item}>{item}</Text>)}
    </Section>
    <Section title="Confirm">
      <SelectInput
        items={[
          { label: 'Create variant', value: 'confirm' },
          { label: 'Back', value: 'back' },
          { label: 'Cancel', value: 'cancel' },
        ]}
        onSelect={item => {
          if (item.value === 'confirm') onConfirm();
          if (item.value === 'back') onBack();
          if (item.value === 'cancel') onCancel();
        }}
      />
    </Section>
  </Box>
);

export const Progress = ({ title, lines }: { title: string; lines: string[] }) => (
  <Box flexDirection="column">
    <Header title={title} subtitle="Please keep this window open." />
    <Section title="Status">
      <Box>
        <Text color="green">
          <Spinner type="dots" /> Working...
        </Text>
      </Box>
      {lines.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          {lines.map((line, idx) => (
            <Text key={`${line}-${idx}`} dimColor>
              {line}
            </Text>
          ))}
        </Box>
      ) : null}
    </Section>
  </Box>
);

export const Completion = ({
  title,
  lines,
  onDone,
}: {
  title: string;
  lines: string[];
  onDone: (value: string) => void;
}) => (
  <Box flexDirection="column">
    <Header title={title} subtitle="All done." />
    <Section title="Result">
      {lines.map(line => (
        <Text key={line}>{line}</Text>
      ))}
    </Section>
    <Section title="Next">
      <SelectInput items={[{ label: 'Back to home', value: 'home' }, { label: 'Exit', value: 'exit' }]} onSelect={item => onDone(item.value)} />
    </Section>
  </Box>
);

export const VariantList = ({
  variants,
  onSelect,
  onBack,
}: {
  variants: { name: string }[];
  onSelect: (value: string) => void;
  onBack: () => void;
}) => {
  const items = variants.map(item => ({ label: item.name, value: item.name }));
  items.push({ label: 'Back', value: '__back' });

  return (
    <Box flexDirection="column">
      <Header title="Manage variants" subtitle="Update, remove, or inspect existing installs." />
      <Section title="Variants">
        {variants.length === 0 ? <Text dimColor>No variants found.</Text> : null}
        <SelectInput
          items={items}
          onSelect={item => {
            if (item.value === '__back') {
              onBack();
              return;
            }
            onSelect(item.value);
          }}
        />
      </Section>
      <Footer hint="Press Esc to return home." />
    </Box>
  );
};

export const VariantActions = ({
  meta,
  onUpdate,
  onTweak,
  onRemove,
  onBack,
}: {
  meta: VariantMeta & { wrapperPath: string };
  onUpdate: () => void;
  onTweak: () => void;
  onRemove: () => void;
  onBack: () => void;
}) => (
  <Box flexDirection="column">
    <Header title={`Variant: ${meta.name}`} subtitle={meta.provider ? `Provider: ${meta.provider}` : ''} />
    <Section title="Paths">
      <SummaryLine label="Runtime" value={`NPM (${meta.npmPackage || 'default'})`} />
      <SummaryLine label="Binary" value={meta.binaryPath} />
      <SummaryLine label="Config" value={meta.configDir} />
      <SummaryLine label="Wrapper" value={meta.wrapperPath} />
    </Section>
    <Section title="Actions">
      <SelectInput
        items={[
          { label: 'Update binary + reapply tweakcc', value: 'update' },
          { label: 'Open tweakcc UI for this variant', value: 'tweak' },
          { label: 'Remove variant', value: 'remove' },
          { label: 'Back', value: 'back' },
        ]}
        onSelect={item => {
          if (item.value === 'update') onUpdate();
          if (item.value === 'tweak') onTweak();
          if (item.value === 'remove') onRemove();
          if (item.value === 'back') onBack();
        }}
      />
    </Section>
  </Box>
);

export const DoctorReport = ({
  report,
  onDone,
}: {
  report: { name: string; ok: boolean }[];
  onDone: () => void;
}) => (
  <Box flexDirection="column">
    <Header title="Doctor" subtitle="Quick sanity check of binaries and wrappers." />
    <Section title="Report">
      {report.length === 0 ? <Text dimColor>No variants found.</Text> : null}
      {report.map(item => (
        <Text key={item.name}>
          {item.ok ? '✓' : '✗'} {item.name}
        </Text>
      ))}
    </Section>
    <Section title="Actions">
      <SelectInput items={[{ label: 'Back to home', value: 'home' }]} onSelect={() => onDone()} />
    </Section>
  </Box>
);

export const EnvPreview = ({ env }: { env: ProviderEnv }) => (
  <Section title="Environment preview">
    {Object.entries(env).map(([key, value]) => (
      <Text key={key}>{`${key}=${value}`}</Text>
    ))}
  </Section>
);
