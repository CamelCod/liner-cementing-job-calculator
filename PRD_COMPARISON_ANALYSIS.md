# PRD vs Current Implementation Comparison Analysis

## Executive Summary

After analyzing the current calculation engine against your comprehensive PRD specifications, there are significant differences in approach, input structure, calculation methodology, and output schema. The current implementation is simplified compared to your detailed engineering specifications.

## Key Differences Found

### 1. **Input Structure & Types**

**PRD Specification:**
```typescript
{
  casing: { id:number, od:number, md:number, tvd:number },
  liner:  { id:number, od:number, md:number, tvd:number, length:number },
  dp1:    { id:number, od:number, length:number },
  dp2:    { id:number, od:number, length:number },
  dpConfig: 'single'|'dual',
  mud:    { ppg:number },
  spacers: [{ label:string, volumeBbl:number, ppg:number }],
  cements: [{ label:string, volumeBbl:number, ppg:number }],
  displacements: [{ label:string, volumeBbl:number, ppg:number }],
  holeOverlap: { openHoleId:number, linerOverlapFt:number, shoeTrackLengthFt:number, cementThickeningTimeMin:number, rigCapacityLbs:number, stingerId?:number, stingerLengthFt?:number },
  landingCollarMd: number,
  totalDepthMd: number,
  setdownForceLbs: number,
  hookloadSF: number,
  forceSF: number,
  findTvdFromMd: (md:number)=>string
}
```

**Current Implementation:**
```typescript
{
  casing: PipeConfig,           // String-based fields requiring parsing
  liner: PipeConfig,            // String-based fields requiring parsing  
  dp1: PipeConfig,             // String-based fields requiring parsing
  dp2: PipeConfig,             // String-based fields requiring parsing
  // ... similar pattern with string parsing throughout
}
```

**DIFFERENCE:** Current uses string-based inputs requiring parsing, PRD specifies explicit numeric types.

### 2. **Calculation Pipeline Methodology**

**PRD Specification (8-step ordered pipeline):**
1. Normalize inputs → parse strings → numbers, ensure MD/TVD monotonicity
2. Capacities → compute bbl/ft for all segments  
3. Define geometric lengths (MD basis)
4. Compute cement capacity below LC
5. Distribute cement bottom-up
6. Place spacers & displacements (inside path)
7. Plug shear & bump logic
8. Hydrostatic / U-tube / Cement forces

**Current Implementation:**
- Simple top-down approach
- No explicit cement capacity below LC calculation
- No bottom-up cement distribution
- Missing plug shear/bump logic entirely
- Simplified hydrostatic calculations

### 3. **Core Helper Formulas**

**PRD Specifications:**
```typescript
bblPerFt(outerInch, innerInch=0) = (outer^2 - inner^2) / 1029.4
hydrostaticPsi(ppg, feet) = ppg * 0.052 * feet
linerAreaSqIn = π/4 * (linerOd^2)
psiToForce(psi, areaInSqIn) = psi * areaInSqIn
buoyancyFactor(mudPpg) = (65.5 - mudPpg) / 65.5
stretchInInches = (loadLbs * lengthFt) / (areaIn2 * E_steel) * 12
```

**Current Implementation:**
```typescript
bblPerFt(id, od=0) = od > 0 ? (od^2 - id^2) / 1029.4 : id^2 / 1029.4  // Parameter order reversed
buoyancyFactor = (65.5 - mudWeight) / 65.5  // ✓ Matches
// Missing: hydrostaticPsi, linerAreaSqIn, psiToForce functions
// Has stretch calculation but different approach
```

**DIFFERENCE:** Current has fewer helper functions and different parameter ordering.

### 4. **Critical Missing Calculations**

**Missing from Current Implementation:**

#### A. **Cement Capacity Below Landing Collar**
```typescript
// PRD: Required calculation
cementCapacityBelowLC = V_rat + V_shoe + V_annulusToLC
V_rat = ratHoleFt * bblPerFt(liner.od, openHoleId)
V_shoe = shoeTrackFt * bblPerFt(liner.id)
V_annulusToLC = annulusToLcFt * bblPerFt(liner.od, annulusInner)
```
**Current:** No explicit calculation of cement capacity below LC.

#### B. **Bottom-Up Cement Distribution**
```typescript
// PRD: Bottom-up filling logic
remainingCement = sum(cements.volumeBbl)
// Fill ratHole → shoeTrack → annulusToLC
// Record segments with topMd, bottomMd, topTvd, bottomTvd
```
**Current:** Simple annular fluid column approach without bottom-up logic.

#### C. **Plug Shear & Bump Logic**
```typescript
// PRD: Required calculations
stringInternalVolBbl = DP1_int + DP2_int + stingerLength*bblPerFt(stingerId)
canShear = volumePumpedBeforeDart >= stringInternalVolBbl
volumeToPushPlugToLC = linerInternalExcludingShoeBbl
canPushToLC = pumpedAfterShear >= volumeToPushPlugToLC
```
**Current:** Completely missing - no plug logic implemented.

#### D. **Geometric Length Definitions**
```typescript
// PRD: Explicit MD-based calculations
ratHoleFt = max(totalDepthMd - liner.md, 0)
shoeTrackFt = numericHoleOverlap.shoeTrackLength
annulusToLcFt = max(liner.md - shoeTrackFt - landingCollarMd, 0)
linerLengthFt = liner.md - topOfLinerMd
```
**Current:** Some calculations present but not following PRD naming/structure.

### 5. **Output Schema Differences**

**PRD Required Outputs:**
```typescript
{
  cementCapacityBelowLandingCollar: number,
  cementVolumePumped: number,
  excessCementBbl: number,
  shortageBbl: number,
  topOfCementMd: number,
  topOfCementTvd: number,
  reachedLandingCollar: boolean,
  stringInternalVolBbl: number,
  canShear: boolean,
  canPushToLC: boolean,
  annularColumns: [...],
  insideColumns: [...],
  cementForceCalcs: {...},
  warnings: [...]
}
```

**Current Output:** Missing most PRD-specified fields, different structure.

### 6. **Business Rules & Edge Cases**

**PRD Specifications:**
- If landingCollarMd >= pLiner.md → error
- CementPpg missing → assume primary cement PPG or fail
- DP2 length==0 and dpConfig=='dual' → treat as absent
- Floating point tolerance eps = 1e-6
- If cementCapacityBelowLC == 0 → flag and abort

**Current Implementation:** Missing most validation rules.

### 7. **Units & Basis Consistency**

**PRD Rule:** "Use MD for all volumetric work, TVD for all pressure/hydrostatic work"

**Current Implementation:** Inconsistent unit handling, mixing MD/TVD calculations.

## Priority Fixes Needed

### **HIGH PRIORITY:**

1. **Input Normalization:** Convert string-based inputs to explicit numeric types
2. **Cement Capacity Below LC:** Implement bottom-up cement capacity calculation
3. **Bottom-Up Distribution:** Replace top-down with bottom-up cement placement logic
4. **Plug Logic:** Implement shear and bump calculations
5. **Output Schema:** Align with PRD-specified return object

### **MEDIUM PRIORITY:**

6. **Helper Functions:** Add missing formulas (hydrostaticPsi, psiToForce, etc.)
7. **Geometric Calculations:** Implement explicit MD-based length definitions
8. **Business Rules:** Add validation and edge case handling
9. **Warning System:** Implement warning array for critical conditions

### **LOW PRIORITY:**

10. **Test Vectors:** Implement unit tests for validation cases
11. **Modular Architecture:** Split into discrete functions as specified
12. **Logging:** Add detailed calculation logging

## Specific Implementation Gaps

### **Missing Core Functions:**
- `normalizeInputs()`
- `computeCaps()`  
- `computeCementDistributionBelowLandingCollar()`
- `buildInsideFluidColumns()` (exists but different logic)
- `computeHydrostaticProfile()`
- `computeCementForces()` (exists but simplified)
- `computeBuoyancyHookloadStretch()`
- `assembleResults()`

### **Missing Calculations:**
- Rat hole volume calculation
- Shoe track cement volume
- Annulus to LC volume
- Excess/shortage cement volumes
- Top of cement MD/TVD tracking
- String internal volume for plug logic
- Stinger considerations

## Conclusion

The current implementation provides basic cementing calculations but lacks the engineering rigor and completeness specified in your PRD. A significant refactor is needed to align with the detailed specifications, particularly around:

1. **Bottom-up cement distribution logic**
2. **Plug shear and bump calculations** 
3. **Proper cement capacity below landing collar**
4. **Input/output schema alignment**
5. **Comprehensive validation and edge case handling**

The PRD represents a much more sophisticated and industry-standard approach to liner cementing calculations.
