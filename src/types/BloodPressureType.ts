interface BloodPressureResponse {
    code: number;
    data: BloodPressureData[];
    dataType: number;
  }
  
  interface BloodPressureData {
    bloodDBP: number;
    bloodSBP: number;
    bloodStartTime: string;
    isInflated: number;
  }