interface SportDataResponse {
    code: number;
    data: SportData[];
    dataType: number;
  }
  
  interface SportData {
    sportCalorie: number;
    sportDistance: number;
    sportEndTime: string;
    sportStartTime: string;
    sportStep: number;
  }