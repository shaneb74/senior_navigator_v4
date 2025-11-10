export type VaDependentKey =
  | 'veteran_alone'
  | 'with_spouse'
  | 'with_spouse_one_child'
  | 'with_spouse_two_plus_children'
  | 'children_only';

type RatingKey = 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;

const VA_DISABILITY_RATES: Record<RatingKey, Record<VaDependentKey, number>> = {
  0: {
    veteran_alone: 0,
    with_spouse: 0,
    with_spouse_one_child: 0,
    with_spouse_two_plus_children: 0,
    children_only: 0,
  },
  10: {
    veteran_alone: 175.51,
    with_spouse: 175.51,
    with_spouse_one_child: 175.51,
    with_spouse_two_plus_children: 175.51,
    children_only: 175.51,
  },
  20: {
    veteran_alone: 346.95,
    with_spouse: 346.95,
    with_spouse_one_child: 346.95,
    with_spouse_two_plus_children: 346.95,
    children_only: 346.95,
  },
  30: {
    veteran_alone: 537.42,
    with_spouse: 601.42,
    with_spouse_one_child: 651.42,
    with_spouse_two_plus_children: 697.42,
    children_only: 587.42,
  },
  40: {
    veteran_alone: 774.16,
    with_spouse: 859.16,
    with_spouse_one_child: 925.16,
    with_spouse_two_plus_children: 987.16,
    children_only: 840.16,
  },
  50: {
    veteran_alone: 1_102.04,
    with_spouse: 1_208.04,
    with_spouse_one_child: 1_274.04,
    with_spouse_two_plus_children: 1_336.04,
    children_only: 1_168.04,
  },
  60: {
    veteran_alone: 1_393.10,
    with_spouse: 1_519.10,
    with_spouse_one_child: 1_598.10,
    with_spouse_two_plus_children: 1_671.10,
    children_only: 1_472.10,
  },
  70: {
    veteran_alone: 1_758.95,
    with_spouse: 1_908.95,
    with_spouse_one_child: 1_997.95,
    with_spouse_two_plus_children: 2_080.95,
    children_only: 1_847.95,
  },
  80: {
    veteran_alone: 2_041.83,
    with_spouse: 2_216.83,
    with_spouse_one_child: 2_315.83,
    with_spouse_two_plus_children: 2_408.83,
    children_only: 2_140.83,
  },
  90: {
    veteran_alone: 2_300.54,
    with_spouse: 2_500.54,
    with_spouse_one_child: 2_609.54,
    with_spouse_two_plus_children: 2_712.54,
    children_only: 2_409.54,
  },
  100: {
    veteran_alone: 3_831.73,
    with_spouse: 4_057.73,
    with_spouse_one_child: 4_205.73,
    with_spouse_two_plus_children: 4_347.73,
    children_only: 3_987.73,
  },
};

function normalizeRating(value: number | string | null | undefined): RatingKey | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const clamped = Math.min(100, Math.max(0, Math.round(numeric / 10) * 10));
  if (clamped % 10 !== 0) {
    return null;
  }
  return clamped as RatingKey;
}

function normalizeDependent(value: string | null | undefined): VaDependentKey | null {
  if (!value) {
    return null;
  }
  const candidate = value as VaDependentKey;
  return VA_DISABILITY_RATES[100].hasOwnProperty(candidate) ? candidate : null;
}

export function getVaDisabilityAmount(
  rating: number | string | null | undefined,
  dependent: string | null | undefined
): number {
  const normalizedRating = normalizeRating(rating);
  const normalizedDependent = normalizeDependent(dependent as VaDependentKey);
  if (normalizedRating === null || normalizedDependent === null) {
    return 0;
  }
  return VA_DISABILITY_RATES[normalizedRating][normalizedDependent] ?? 0;
}
