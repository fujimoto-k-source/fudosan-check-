
export interface ReviewResult {
  item: string;
  originalContent: string;
  factCheckResult: string;
  judgment: 'PASS' | 'WARNING' | 'FAIL';
  suggestion: string;
  source: string;
  sourceUrl?: string;
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}

export interface ComplianceReport {
  results: ReviewResult[];
  revisedAdCopy?: string;
  overallComment: string;
  groundingSources?: GroundingChunk[];
}

export interface FileData {
  name: string;
  content: string | ArrayBuffer;
  type: string;
  isExcel?: boolean;
}
