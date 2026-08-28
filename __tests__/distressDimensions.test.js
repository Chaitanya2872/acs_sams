const {
  normalizeDistressDimensionsValue,
  normalizeNestedDistressDimensions
} = require('../src/models/schemas');

describe('distress dimensions normalization', () => {
  test('keeps the No. count for every measurement unit', () => {
    expect(
      normalizeDistressDimensionsValue({ number: 4, length: 2, unit: 'RM' })
    ).toEqual({ number: 4, length: 2, breadth: 0, height: 0, unit: 'RM' });

    expect(
      normalizeDistressDimensionsValue({
        number: 3,
        length: 2,
        breadth: 1.5,
        unit: 'SQM'
      })
    ).toEqual({ number: 3, length: 2, breadth: 1.5, height: 0, unit: 'SQM' });

    expect(
      normalizeDistressDimensionsValue({
        number: 2,
        length: 3,
        breadth: 2,
        height: 1,
        unit: 'CUM'
      })
    ).toEqual({ number: 2, length: 3, breadth: 2, height: 1, unit: 'CUM' });

    expect(
      normalizeDistressDimensionsValue({ number: 7, length: 9, unit: 'NO\'S' })
    ).toEqual({ number: 7, length: 0, breadth: 0, height: 0, unit: "NO'S" });
  });

  test('falls back to NO\'S for unknown units and coerces string input', () => {
    expect(
      normalizeDistressDimensionsValue({ number: '5', length: '2', unit: 'cm' })
    ).toEqual({ number: 5, length: 0, breadth: 0, height: 0, unit: "NO'S" });
  });

  test('normalizes nested dimensions without losing the No. count', () => {
    const structure = {
      structural_rating: {
        beams: { distress_dimensions: { number: 6, length: 4, unit: 'sqm' } }
      }
    };

    normalizeNestedDistressDimensions(structure);

    expect(structure.structural_rating.beams.distress_dimensions).toEqual({
      number: 6,
      length: 4,
      breadth: 0,
      height: 0,
      unit: 'SQM'
    });
  });
});
