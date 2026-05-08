import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { endOfDay, startOfDay } from 'date-fns';

import {
  Button,
  Card,
  Hairline,
  KJReadout,
  KJTrendChart,
  MacrosBar,
  MeasurementTape,
  Ring,
  Screen,
  Tag,
  Text,
  cardEntry,
} from '@/components';
import { useTheme } from '@/styles/theme';
import { space } from '@/styles/tokens';
import {
  selectDailyGoalKJ,
  selectTDEE,
  useLog,
  useProfile,
  useSettings,
} from '@/lib/state';
import type { Confidence, FoodEntry, Macros } from '@/types';

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'HIGH CONF.',
  med: 'MED CONF.',
  low: 'LOW CONF.',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function Today(): React.ReactElement {
  const profile = useProfile((s) => s.profile);
  const settings = useSettings((s) => s.settings);
  const goalKJ = useProfile(selectDailyGoalKJ) ?? 0;
  const tdeeKJValue = useProfile(selectTDEE) ?? 0;
  const entries = useLog((s) => s.entries);

  const todayEntries = useMemo<ReadonlyArray<FoodEntry>>(() => {
    const start = startOfDay(new Date()).getTime();
    const end = endOfDay(new Date()).getTime();
    return entries.filter((e) => e.timestamp >= start && e.timestamp <= end);
  }, [entries]);

  const consumedToday = useMemo(
    () => todayEntries.reduce((sum, e) => sum + e.kj, 0),
    [todayEntries],
  );

  const todayMacros = useMemo<Macros>(() => {
    let p = 0;
    let c = 0;
    let f = 0;
    let fi = 0;
    for (const e of todayEntries) {
      if (!e.macros) continue;
      p += e.macros.protein_g;
      c += e.macros.carbs_g;
      f += e.macros.fat_g;
      fi += e.macros.fiber_g ?? 0;
    }
    return { protein_g: p, carbs_g: c, fat_g: f, fiber_g: fi };
  }, [todayEntries]);

  const trend = useMemo<ReadonlyArray<{ ts: number; kj: number }>>(() => {
    const days = 7;
    const todayStart = startOfDay(new Date()).getTime();
    const buckets = new Map<number, number>();
    for (let i = days - 1; i >= 0; i--) {
      buckets.set(todayStart - i * 86_400_000, 0);
    }
    for (const e of entries) {
      const ts = startOfDay(new Date(e.timestamp)).getTime();
      if (buckets.has(ts)) buckets.set(ts, (buckets.get(ts) ?? 0) + e.kj);
    }
    return Array.from(buckets.entries())
      .map(([ts, kj]) => ({ ts, kj }))
      .sort((a, b) => a.ts - b.ts);
  }, [entries]);

  const recent = useMemo<ReadonlyArray<FoodEntry>>(
    () => [...todayEntries].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3),
    [todayEntries],
  );

  const remaining = goalKJ - consumedToday;
  const deficit = tdeeKJValue - consumedToday;
  const today = new Date();
  const dateLabel = today
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();

  const isReady = profile !== null && goalKJ > 0;

  return (
    <Screen scroll>
      <Text variant="micro" tone="muted">{dateLabel}</Text>
      <Text variant="display" style={styles.headline}>
        today.
      </Text>
      <Hairline style={styles.headlineRule} />

      <Animated.View style={styles.heroBlock} entering={cardEntry(0)}>
        <Ring value={consumedToday} max={Math.max(goalKJ, 1)} size={240}>
          <KJReadout
            kj={consumedToday}
            goalKJ={goalKJ || undefined}
            kcalHelper={settings.show_kcal_helper}
            size="lg"
            underline
            align="center"
          />
        </Ring>
      </Animated.View>

      <Animated.View style={styles.tapeBlock} entering={cardEntry(1)}>
        <MeasurementTape
          value={consumedToday}
          max={Math.max(goalKJ, 1)}
          unitLabel="KILOJOULES"
          targetLabel={`${(goalKJ || 0).toLocaleString('en-US')} kJ goal`}
          minorTick={500}
          majorTick={2000}
          overTone={consumedToday > goalKJ}
        />
      </Animated.View>

      <Animated.View style={styles.statsRow} entering={cardEntry(2)}>
        <StatBlock
          label={remaining >= 0 ? 'REMAINING' : 'OVER GOAL'}
          kj={Math.abs(remaining)}
          kcalHelper={settings.show_kcal_helper}
        />
        <View style={styles.statSep} />
        <StatBlock
          label={deficit >= 0 ? 'DEFICIT TODAY' : 'SURPLUS TODAY'}
          kj={Math.abs(deficit)}
          kcalHelper={settings.show_kcal_helper}
        />
      </Animated.View>

      <Animated.View entering={cardEntry(3)}>
        <View style={styles.entriesMeta}>
          <Text variant="micro" tone="muted">
            {`${todayEntries.length} ${todayEntries.length === 1 ? 'entry' : 'entries'} logged`}
          </Text>
        </View>

        <View style={styles.ctaRow}>
          <Button
            label="Log food"
            variant="primary"
            size="lg"
            onPress={() => router.push('/(tabs)/log')}
            fullWidth
          />
        </View>
      </Animated.View>

      <Animated.View style={styles.macrosBlock} entering={cardEntry(4)}>
        <MacrosBar macros={todayMacros} goalKJ={goalKJ || undefined} />
      </Animated.View>

      <Animated.View style={styles.trendBlock} entering={cardEntry(5)}>
        <KJTrendChart data={trend} goalKJ={goalKJ || undefined} />
      </Animated.View>

      <View style={styles.recentBlock}>
        <Text variant="micro" tone="muted">RECENT ENTRIES</Text>
        <Hairline style={styles.recentRule} />
        {recent.length === 0 ? (
          <Text variant="bodySm" tone="muted" style={styles.emptyCopy}>
            {isReady
              ? 'No entries logged today. The table waits.'
              : 'Set up your profile to begin.'}
          </Text>
        ) : (
          recent.map((e) => <RecentRow key={e.id} entry={e} />)
        )}
      </View>
    </Screen>
  );
}

function StatBlock({
  label,
  kj,
  kcalHelper,
}: {
  label: string;
  kj: number;
  kcalHelper: boolean;
}): React.ReactElement {
  return (
    <View style={styles.statBlock}>
      <Text variant="micro" tone="muted" style={styles.statLabel}>{label}</Text>
      <KJReadout
        kj={kj}
        size="md"
        underline={false}
        kcalHelper={kcalHelper}
        align="left"
      />
    </View>
  );
}

function RecentRow({ entry }: { entry: FoodEntry }): React.ReactElement {
  const { t } = useTheme();
  return (
    <Card variant="recessed" style={styles.recentCard}>
      <View style={styles.recentRow}>
        <View style={styles.recentLeft}>
          <Text variant="label" numberOfLines={1}>{entry.name}</Text>
          <Text variant="bodySm" tone="muted">{formatTime(entry.timestamp)}</Text>
        </View>
        <View style={styles.recentRight}>
          <Text
            variant="mono"
            style={{ color: t.ink }}
          >
            {`${entry.kj.toLocaleString('en-US')} kJ`}
          </Text>
          {entry.confidence ? (
            <Tag label={CONFIDENCE_LABEL[entry.confidence]} tone="neutral" />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headline: {
    marginTop: space.xs,
  },
  headlineRule: {
    marginTop: space.sm,
    marginBottom: space.xl,
  },
  heroBlock: {
    alignItems: 'center',
    marginBottom: space.lg,
  },
  tapeBlock: {
    marginBottom: space.xl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: space.md,
  },
  statBlock: {
    flex: 1,
  },
  statSep: {
    width: space.lg,
  },
  statLabel: {
    marginBottom: space.xs,
  },
  entriesMeta: {
    marginBottom: space.lg,
  },
  ctaRow: {
    marginBottom: space.xl,
  },
  macrosBlock: {
    marginBottom: space.xl,
  },
  trendBlock: {
    marginBottom: space.xl,
  },
  recentBlock: {
    marginBottom: space.lg,
  },
  recentRule: {
    marginTop: space.xs,
    marginBottom: space.md,
  },
  recentCard: {
    marginBottom: space.sm,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentLeft: {
    flex: 1,
    paddingRight: space.md,
  },
  recentRight: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
  emptyCopy: {
    paddingVertical: space.md,
  },
});
