interface ComprehensiveDataItem {
  DBPValue: number;
  OOValue: number;
  SBPValue: number;
  cvrrValue: number;
  heartValue: number;
  hrvValue: number;
  respiratoryRateValue: number;
  startTime: string;
  stepValue: number;
  tempFloatValue: number;
  tempIntValue: number;
}

interface ComprehensiveOverview {
  DBPValueAvg: number;
  OOValueAvg: number;
  SBPValueAvg: number;
  cvrrValueAvg: number;
  heartValueAvg: number;
  hrvValueAvg: number;
  respiratoryRateValueAvg: number;
  stepValueAvg: number;
  tempFloatValueAvg: number;
  tempIntValueAvg: number;
}

interface ComprehensiveData {
  data: ComprehensiveDataItem[];
  dataType: number;
  overview: ComprehensiveOverview;
}