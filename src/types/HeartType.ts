interface HeartDataResponse {
    code: number;
    data: HeartData[];
    dataType: number;
  }
  
  interface HeartData {
    heartStartTime: string;
    heartValue: number;
  }