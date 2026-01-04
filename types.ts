
export enum DiseaseType {
  ALL = "急性淋巴细胞白血病",
  AML = "急性髓细胞白血病",
  APL = "急性早幼粒细胞白血病",
  CML = "慢性粒细胞白血病"
}

export interface StructuredContent {
  prognosisLevel: "良好" | "中等" | "预后差" | "未知";
  summary: string;
  clinicalSignificance: string[];
  recommendations: string[];
  targetedTherapy?: string;
  disclaimer: string;
}

export interface QueryResult {
  source: 'internal' | 'external' | 'both';
  structuredData: StructuredContent;
  groundingUrls?: string[];
}
