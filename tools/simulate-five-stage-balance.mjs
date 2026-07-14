import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../assets/scripts/bottlehero/BottleHeroBalance.ts', import.meta.url), 'utf8');
const requiredMarkers = [
  "id: 'newbie'",
  "id: 'familiar'",
  "id: 'skilled'",
  "id: 'challenge'",
  "id: 'hard'",
  'createTimingTargetPlan',
  'getCurrentStageState',
];

for (const marker of requiredMarkers) {
  if (!source.includes(marker)) {
    throw new Error(`Missing balance marker: ${marker}`);
  }
}

const stages = [
  { label: 'Newbie', min: 1, max: 1, bias: -100 },
  { label: 'Familiar', min: 1, max: 2, bias: -85 },
  { label: 'Skilled', min: 2, max: 3, bias: -55 },
  { label: 'Challenge', min: 2, max: 3, bias: 35 },
  { label: 'Hard', min: 2, max: 3, bias: 65 },
];

for (const stage of stages) {
  const rewardWeight = Math.max(0, 100 - stage.bias);
  const penaltyWeight = Math.max(0, 100 + stage.bias);
  const total = rewardWeight + penaltyWeight;
  const rewardRate = total > 0 ? rewardWeight / total : 0;
  const penaltyRate = total > 0 ? penaltyWeight / total : 0;
  console.log(`${stage.label}: targets=${stage.min}-${stage.max} reward=${(rewardRate * 100).toFixed(1)}% penalty=${(penaltyRate * 100).toFixed(1)}%`);
}
