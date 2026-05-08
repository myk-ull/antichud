import {
  ACTIVITY_MULTIPLIERS,
  DEFAULT_BULK_SURPLUS_KJ,
  DEFAULT_CUT_DEFICIT_KJ,
  KCAL_TO_KJ,
  bmi,
  bmiCategory,
  bmrKJ,
  dailyGoalKJ,
  kcalToKJ,
  kjToKcal,
  remainingKJ,
  tdeeKJ,
} from '@/lib/calc';

describe('constants', () => {
  it('KCAL_TO_KJ is the standard conversion factor', () => {
    expect(KCAL_TO_KJ).toBe(4.184);
  });

  it('ACTIVITY_MULTIPLIERS covers all five levels with canonical values', () => {
    expect(ACTIVITY_MULTIPLIERS).toEqual({
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    });
  });

  it('default deficit/surplus constants', () => {
    expect(DEFAULT_CUT_DEFICIT_KJ).toBe(2000);
    expect(DEFAULT_BULK_SURPLUS_KJ).toBe(1500);
  });
});

describe('kcalToKJ / kjToKcal', () => {
  it('kcalToKJ rounds to nearest int', () => {
    expect(kcalToKJ(100)).toBe(418);
    expect(kcalToKJ(0)).toBe(0);
    expect(kcalToKJ(2000)).toBe(8368);
  });

  it('kjToKcal rounds to nearest int', () => {
    expect(kjToKcal(2000)).toBe(478);
    expect(kjToKcal(0)).toBe(0);
    expect(kjToKcal(8368)).toBe(2000);
  });
});

describe('bmrKJ', () => {
  it('male: Mifflin-St Jeor in kJ (80kg, 180cm, 30y)', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780 kcal
    // 1780 * 4.184 = 7447.52 -> 7448 kJ
    expect(bmrKJ({ sex: 'male', weight_kg: 80, height_cm: 180, age: 30 })).toBe(
      7448,
    );
  });

  it('female: Mifflin-St Jeor in kJ (65kg, 165cm, 30y)', () => {
    // 10*65 + 6.25*165 - 5*30 - 161 = 1370.25 kcal
    // 1370.25 * 4.184 = 5733.126 -> 5733 kJ
    expect(
      bmrKJ({ sex: 'female', weight_kg: 65, height_cm: 165, age: 30 }),
    ).toBe(5733);
  });

  it('male/female differ by 166 kcal (= ~695 kJ) for identical body params', () => {
    const m = bmrKJ({ sex: 'male', weight_kg: 70, height_cm: 175, age: 35 });
    const f = bmrKJ({ sex: 'female', weight_kg: 70, height_cm: 175, age: 35 });
    expect(m - f).toBe(Math.round(166 * KCAL_TO_KJ));
  });
});

describe('tdeeKJ', () => {
  it('multiplies BMR by activity multiplier and rounds', () => {
    expect(tdeeKJ({ bmr_kj: 7448, activity_level: 'sedentary' })).toBe(8938);
    expect(tdeeKJ({ bmr_kj: 7448, activity_level: 'light' })).toBe(10241);
    expect(tdeeKJ({ bmr_kj: 7448, activity_level: 'moderate' })).toBe(11544);
    expect(tdeeKJ({ bmr_kj: 7448, activity_level: 'active' })).toBe(12848);
    expect(tdeeKJ({ bmr_kj: 7448, activity_level: 'very_active' })).toBe(14151);
  });
});

describe('dailyGoalKJ', () => {
  it('cut subtracts default deficit', () => {
    expect(dailyGoalKJ({ tdee_kj: 11544, deficit_mode: 'cut' })).toBe(9544);
  });

  it('bulk adds default surplus', () => {
    expect(dailyGoalKJ({ tdee_kj: 11544, deficit_mode: 'bulk' })).toBe(13044);
  });

  it('maintain returns TDEE unchanged', () => {
    expect(dailyGoalKJ({ tdee_kj: 11544, deficit_mode: 'maintain' })).toBe(
      11544,
    );
  });

  it('override_kj wins over any deficit_mode', () => {
    expect(
      dailyGoalKJ({
        tdee_kj: 11544,
        deficit_mode: 'cut',
        override_kj: 8000,
      }),
    ).toBe(8000);
    expect(
      dailyGoalKJ({
        tdee_kj: 11544,
        deficit_mode: 'bulk',
        override_kj: 8000,
      }),
    ).toBe(8000);
  });
});

describe('remainingKJ', () => {
  it('returns goal − consumed and may be negative', () => {
    expect(remainingKJ({ goal_kj: 9544, consumed_kj: 4000 })).toBe(5544);
    expect(remainingKJ({ goal_kj: 9544, consumed_kj: 9544 })).toBe(0);
    expect(remainingKJ({ goal_kj: 9544, consumed_kj: 12000 })).toBe(-2456);
  });
});

describe('bmi', () => {
  it('weight_kg / height_m^2', () => {
    // 65 / 1.65^2 = 65 / 2.7225 = 23.875...
    expect(bmi({ weight_kg: 65, height_cm: 165 })).toBeCloseTo(23.8751, 3);
  });

  it('handles tall/light correctly', () => {
    expect(bmi({ weight_kg: 50, height_cm: 170 })).toBeCloseTo(17.301, 3);
  });
});

describe('bmiCategory', () => {
  it('classifies values', () => {
    expect(bmiCategory(17)).toBe('underweight');
    expect(bmiCategory(22)).toBe('normal');
    expect(bmiCategory(27)).toBe('overweight');
    expect(bmiCategory(32)).toBe('obese');
  });

  it('honors boundaries: <18.5, <25, <30, ≥30', () => {
    // 18.5 boundary: just below is underweight, exactly 18.5 is normal
    expect(bmiCategory(18.49)).toBe('underweight');
    expect(bmiCategory(18.5)).toBe('normal');
    // 25 boundary
    expect(bmiCategory(24.99)).toBe('normal');
    expect(bmiCategory(25)).toBe('overweight');
    // 30 boundary
    expect(bmiCategory(29.99)).toBe('overweight');
    expect(bmiCategory(30)).toBe('obese');
  });
});
