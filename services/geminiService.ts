
import { GoogleGenAI, Type } from "@google/genai";
import type { PipeConfig, Fluid, HoleOverlapConfig, MudConfig, SurveyRow, Calculations, DeproReport } from '../types';

/**
 * Secure AI initialization with enhanced error handling
 * API key is validated and initialized securely
 */
const getGeminiApiKey = (): string => {
  // Check multiple environment variable names for flexibility
  const apiKey = (
    process.env.GEMINI_API_KEY || 
    process.env.GOOGLE_API_KEY || 
    process.env.API_KEY || 
    ''
  ).trim();

  // Validate API key format (basic validation)
  if (apiKey && !apiKey.startsWith('AIza')) {
    console.warn('Warning: Gemini API key format appears invalid. Expected format: AIza...');
  }

  return apiKey;
};

const GEMINI_API_KEY = getGeminiApiKey();
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

/**
 * Check if AI services are available
 */
export const isAiAvailable = (): boolean => {
  return Boolean(ai && GEMINI_API_KEY);
};

interface ProcedureData {
  casing: PipeConfig;
  liner: PipeConfig;
  holeOverlap: HoleOverlapConfig;
  mud: MudConfig;
  spacers: Fluid[];
  cements: Fluid[];
  displacements: Fluid[];
}

interface PackerForceData {
    dp1: PipeConfig;
    dp2: PipeConfig;
    mud: MudConfig;
    surveyData: SurveyRow[];
    packerForce: number;
}

interface DeproAnalysisData {
    inputs: {
        casing: PipeConfig;
        liner: PipeConfig;
        dp1: PipeConfig;
        dp2: PipeConfig;
        holeOverlap: HoleOverlapConfig;
        mud: MudConfig;
        fluids: {
            spacers: Fluid[];
            cements: Fluid[];
            displacements: Fluid[];
        },
        surveyData: SurveyRow[];
    };
    calculations: Calculations;
}


export const generateCementingProcedure = async (data: ProcedureData): Promise<string> => {
  if (!ai) {
    return "AI features are disabled. Please configure your API key to enable procedure generation.";
  }
  const { casing, liner, holeOverlap, mud, spacers, cements, displacements } = data;
  
  const prompt = `
    You are a senior drilling engineer. Write a detailed, step-by-step cementing procedure for a liner cementing job. The procedure should be based on the following parameters and written in a professional, clear, and safe manner. Do not include a specific well name.

    Well Parameters:
    - Parent Casing OD: ${casing.od} in, ID: ${casing.id} in, MD: ${casing.md} ft, TVD: ${casing.tvd} ft
    - Liner OD: ${liner.od} in, ID: ${liner.id} in, MD: ${liner.md} ft, TVD: ${liner.tvd} ft
    - Open Hole ID: ${holeOverlap.openHoleId} in
    - Liner Overlap: ${holeOverlap.linerOverlap} ft
    - Shoe Track Length: ${holeOverlap.shoeTrackLength} ft

    Fluid Schedule:
    - Mud Weight: ${mud.ppg} ppg
    ${spacers.map(s => `- Spacer: ${s.label} with Volume: ${s.volume} bbl, Weight: ${s.ppg} ppg`).join('\n')}
    ${cements.map(c => `- Cement: ${c.label} with Volume: ${c.volume} bbl, Weight: ${c.ppg} ppg`).join('\n')}
    ${displacements.map(d => `- Displacement Fluid: ${d.label} with Volume: ${d.volume} bbl, Weight: ${d.ppg} ppg`).join('\n')}

    The response should be a comprehensive, well-structured procedure including sections for:
    1.  Pre-job checks (equipment, pipe, fluids).
    2.  Pumping sequence (include volumes and fluid names).
    3.  Displacement and bump plug.
    4.  Post-job considerations (e.g., waiting on cement, pressure testing).
    Make sure to reference the fluid names, volumes, and weights provided. Output in markdown format.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text ?? '';
  } catch (error) {
    // Log error securely without exposing sensitive details
    if (process.env.NODE_ENV === 'development') {
      console.error("Gemini API Error (generateCementingProcedure):", error);
    }
    return "An error occurred while generating the cementing procedure. Please check your API configuration and try again.";
  }
};

export const runRiskAssessment = async (data: ProcedureData): Promise<string> => {
  if (!ai) {
    return "AI features are disabled. Please configure your API key to enable risk assessment.";
  }
    const { casing, liner, holeOverlap, mud, spacers, cements, displacements } = data;

    const prompt = `
    You are a senior drilling safety and risk management engineer. Analyze the following well and fluid parameters for a liner cementing job. Identify any potential safety or operational risks. Focus on issues such as lost circulation due to high Equivalent Circulating Density (ECD), potential for fluid contamination or incompatibility, and challenges with hole cleaning. Provide a bulleted list of risks and a brief, actionable mitigation for each. Use the provided data to form your assessment.

    Well Parameters:
    - Parent Casing OD: ${casing.od} in, ID: ${casing.id} in, MD: ${casing.md} ft
    - Liner OD: ${liner.od} in, ID: ${liner.id} in, MD: ${liner.md} ft
    - Open Hole ID: ${holeOverlap.openHoleId} in
    - Liner Overlap: ${holeOverlap.linerOverlap} ft
    - Shoe Track Length: ${holeOverlap.shoeTrackLength} ft
    - Mud Weight: ${mud.ppg} ppg
    
    Fluid Schedule (weights only):
    - Mud: ${mud.ppg} ppg
    ${spacers.map(s => `- Spacer: ${s.ppg} ppg`).join('\n')}
    ${cements.map(c => `- Cement: ${c.ppg} ppg`).join('\n')}
    ${displacements.map(d => `- Displacement Fluid: ${d.ppg} ppg`).join('\n')}

    Output a markdown-formatted report with a clear title, a summary of potential risks, and a bulleted list of risks with their mitigations.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text ?? '';
  } catch (error) {
    // Log error securely without exposing sensitive details
    if (process.env.NODE_ENV === 'development') {
      console.error("Gemini API Error (runRiskAssessment):", error);
    }
    return "An error occurred while generating the risk assessment. Please check your API configuration and try again.";
  }
};


export const explainDrillingTerm = async (term: string): Promise<string> => {
  if (!term) {
    return "Please enter a term to explain.";
  }
  if (!ai) {
    return "AI features are disabled. Please configure your API key to enable term explanations.";
  }

    const prompt = `
    Explain the drilling engineering term "${term}" in a simple, clear manner for someone new to the industry. Provide a brief definition and describe its importance or role in drilling operations.
    `;

  try {
    const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
    return response.text ?? '';
    } catch (error) {
        // Log error securely without exposing sensitive details
        if (process.env.NODE_ENV === 'development') {
            console.error("Gemini API Error (explainDrillingTerm):", error);
        }
        return "An error occurred while explaining the term. Please check your API configuration and try again.";
    }
};

export const simulatePackerSettingForce = async (data: PackerForceData): Promise<string> => {
  if (!ai) {
    return "AI features are disabled. Please configure your API key to enable packer force simulation.";
  }
    const { dp1, dp2, mud, surveyData, packerForce } = data;
    
  const dp1Length = parseFloat(dp1.length || '0');
  const dp2Length = parseFloat(dp2.length || '0');
    const maxInclination = surveyData.length > 0 ? Math.max(...surveyData.map(r => parseFloat(r[2] || '0'))) : 0;
    
    const dp1AirWeight = dp1Length * parseFloat(dp1.wt || '0');
    const dp2AirWeight = dp2Length * parseFloat(dp2.wt || '0');
    const totalAirWeight = dp1AirWeight + dp2AirWeight;
    const buoyancyFactor = (65.5 - parseFloat(mud.ppg || '0')) / 65.5;
    const buoyedWeight = totalAirWeight * buoyancyFactor;
    const friction = buoyedWeight * Math.sin(degreesToRadians(maxInclination)) * 0.25; // Assuming 0.25 friction factor

    const prompt = `
    You are a Completions Engineer providing a concise summary for a packer setting force simulation.

    **Task:**
    Provide a simplified summary of the packer setting force calculation. Explain that the surface slack-off weight must account for the desired downhole force plus the buoyed weight of the string and frictional losses. Do not show the step-by-step math. Present the final result clearly.

    **Output Format:**
    - A main heading "Packer Setting Force Summary".
    - A short paragraph explaining the principle.
    - A bulleted list showing the key components:
        - Buoyed Weight of the string: ${buoyedWeight.toLocaleString(undefined, {maximumFractionDigits: 0})} lbs
        - Estimated Frictional Drag: ${friction.toLocaleString(undefined, {maximumFractionDigits: 0})} lbs
        - Required Downhole Force: ${packerForce.toLocaleString()} lbs
    - A concluding sentence with the final, bolded **Required Surface Slack-off Weight**. The final weight is the sum of the three components above.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text ?? '';
  } catch (error) {
    // Log error securely without exposing sensitive details
    if (process.env.NODE_ENV === 'development') {
      console.error("Gemini API Error (simulatePackerSettingForce):", error);
    }
    return "An error occurred during packer force simulation. Please check your API configuration and try again.";
  }
};

const degreesToRadians = (deg: number) => deg * (Math.PI / 180);

export const generateDeproAnalysis = async (data: DeproAnalysisData): Promise<DeproReport> => {
  if (!ai) {
    return {
      title: "AI Disabled",
      executiveSummary: "AI features are disabled. Please configure your API key to enable DEPRO analysis.",
      introduction: "",
      jobDetails: "",
      volumetricAnalysis: "",
      mechanicalAnalysis: "",
      conclusion: "",
    };
  }

    const deproContext = `
DEPRO is a comprehensive torque, drag, and hydraulics program. Using this software, users can reduce many of the risks encountered in drilling and completion operations. DEPRO predicts the limits in the length of a horizontal well based on specific friction factors, recommends rig specifications, and evaluates the required weight to set a packer. For hydraulics, DEPRO covers downhole circulating pressures, surge and swab, equivalent circulation densities (ECD), bit optimization, hole cleaning, and volumetric displacements. Using DEPRO, downhole drilling hydraulic conditions can be fully examined, and any potential problems can be identified prior to field execution. If you are interested in both TADPRO and HYDPRO, DEPRO is the package for you. It combines all the essential parts of both software programs.
    `;
    
    const responseSchema: DeproReport = {
        title: "",
        executiveSummary: "",
        introduction: "",
        jobDetails: "",
        volumetricAnalysis: "",
        mechanicalAnalysis: "",
        conclusion: ""
    };

    const prompt = `
You are an expert specializing in the DEPRO drilling software. Your task is to provide a summarized but insightful analysis of a simulated liner cementing job.

**Source 1: DEPRO Software Capabilities**
${deproContext}

**Source 2: Simulated Data from DEPRO for a Liner Cementing Job**
The following data represents the inputs and calculated outputs.
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

**Your Task:**
Generate a structured report in JSON format that summarizes the analysis.
- **Analyze the data in Source 2** through the lens of the capabilities described in **Source 1**.
- **Keep the content of each section concise and summary-level.**
- **Cite all data points from Source 2 with [i]**.
- **Bold the most important findings** using markdown (**).
- For the 'jobDetails', 'volumetricAnalysis', and 'mechanicalAnalysis' sections, use markdown bullet points for clarity.

Populate the following JSON schema:
`;

  try {
    const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    executiveSummary: { type: Type.STRING },
                    introduction: { type: Type.STRING },
                    jobDetails: { type: Type.STRING },
                    volumetricAnalysis: { type: Type.STRING },
                    mechanicalAnalysis: { type: Type.STRING },
                    conclusion: { type: Type.STRING },
                  },
                  required: Object.keys(responseSchema)
                },
            }
        });
        
  const raw = (response.text ?? '{}').trim();
  const report = JSON.parse(raw) as DeproReport;
        return report;
        
    } catch (error) {
        // Log error securely without exposing sensitive details
        if (process.env.NODE_ENV === 'development') {
            console.error("Gemini API Error (generateDeproAnalysis):", error);
        }
        return {
            title: "Error Generating Report",
            executiveSummary: "An error occurred while generating the DEPRO analysis. Please check your API configuration and try again.",
            introduction: "",
            jobDetails: "",
            volumetricAnalysis: "",
            mechanicalAnalysis: "",
            conclusion: "",
        };
    }
};
