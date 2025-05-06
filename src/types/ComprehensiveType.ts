interface ComprehensiveResponse {
    code: number;
    data: ComprehensiveData[];
    dataType: number;
  }
  
  interface ComprehensiveData {
    DBPValue: number;
    OOValue: number;
    SBPValue: number;
    bloodSugarValue: number;
    bodyFatFloatValue: number;
    bodyFatIntValue: number;
    cvrrValue: number;
    heartValue: number;
    hrvValue: number;
    respiratoryRateValue: number;
    startTime: string;
    stepValue: number;
    tempFloatValue: number;
    tempIntValue: number;
  }