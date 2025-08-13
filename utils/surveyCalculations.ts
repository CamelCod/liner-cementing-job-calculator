/**
 * Survey data calculation utilities
 */

export interface SurveyPoint {
  md: number;
  tvd: number;
}

/**
 * Converts measured depth to true vertical depth using survey data interpolation
 */
export const findTvdFromMd = (
  mdInput: string | number | undefined, 
  surveyData: string[][]
): string => {
  const md = typeof mdInput === 'number' ? mdInput : parseFloat(mdInput || '0');
  
  if (surveyData.length < 2 || isNaN(md)) {
    return md > 0 ? md.toFixed(2) : '0';
  }

  const data = parseSurveyData(surveyData);
  
  // Find exact match first
  const exactMatch = data.find(p => p.md === md);
  if (exactMatch) {
    return exactMatch.tvd.toFixed(2);
  }

  // Find interpolation points
  const beforePoint = data.filter(p => p.md <= md).pop();
  const afterPoint = data.find(p => p.md >= md);

  if (beforePoint && afterPoint) {
    return interpolateTvd(beforePoint, afterPoint, md).toFixed(2);
  }

  // Extrapolation cases
  if (beforePoint) {
    return extrapolateTvdFromEnd(data, md).toFixed(2);
  }

  if (afterPoint) {
    return extrapolateTvdFromStart(data, md).toFixed(2);
  }

  return md.toFixed(2);
};

/**
 * Parse and sort survey data from string array format
 */
const parseSurveyData = (surveyData: string[][]): SurveyPoint[] => {
  return surveyData
    .map(row => ({
      md: parseFloat(row[0] || '0'),
      tvd: parseFloat(row[1] || '0')
    }))
    .filter(point => !isNaN(point.md) && !isNaN(point.tvd))
    .sort((a, b) => a.md - b.md);
};

/**
 * Interpolate TVD between two survey points
 */
const interpolateTvd = (p1: SurveyPoint, p2: SurveyPoint, targetMd: number): number => {
  if (p1.md === p2.md) return p1.tvd;
  
  const slope = (p2.tvd - p1.tvd) / (p2.md - p1.md);
  return p1.tvd + slope * (targetMd - p1.md);
};

/**
 * Extrapolate TVD beyond the last survey point
 */
const extrapolateTvdFromEnd = (data: SurveyPoint[], targetMd: number): number => {
  const lastTwo = data.slice(-2);
  if (lastTwo.length === 2) {
    const p1 = lastTwo[0];
    const p2 = lastTwo[1];
    if (p1 && p2) {
      const slope = (p2.tvd - p1.tvd) / (p2.md - p1.md);
      return p2.tvd + slope * (targetMd - p2.md);
    }
  }
  return data[data.length - 1]?.tvd ?? targetMd;
};

/**
 * Extrapolate TVD before the first survey point
 */
const extrapolateTvdFromStart = (data: SurveyPoint[], targetMd: number): number => {
  const firstTwo = data.slice(0, 2);
  if (firstTwo.length === 2) {
    const p1 = firstTwo[0];
    const p2 = firstTwo[1];
    if (p1 && p2) {
      const slope = (p2.tvd - p1.tvd) / (p2.md - p1.md);
      return p1.tvd + slope * (targetMd - p1.md);
    }
  }
  return data[0]?.tvd ?? targetMd;
};
