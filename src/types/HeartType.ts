interface HeartRateItem {
  heartStartTime: string;
  heartValue: number;
}

interface HeartRateData {
  avgHeartRate: number;
  data: HeartRateItem[];
}