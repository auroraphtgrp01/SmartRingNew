interface BloodPressureItem {
  bloodDBP: number;
  bloodSBP: number;
  bloodStartTime: string;
}

interface AverageBloodPressure {
  avgDBP: number;
  avgSBP: number;
}

interface BloodPressureData {
  averageData: AverageBloodPressure;
  historyData: BloodPressureItem[];
}