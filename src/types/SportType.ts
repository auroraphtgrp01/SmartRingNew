interface SportDataItem {
  sportCalorie: number;
  sportDistance: number;
  sportEndTime: string;
  sportStartTime: string;
  sportStep: number;
}

interface SportData {
  code: number;
  data: SportDataItem[];
  dataType: number;
}