/**
 * Service quản lý các setter functions từ Context API
 * Cho phép các file TypeScript (.ts) truy cập và cập nhật dữ liệu trong Context API
 */
export class ContextStoreService {
  private static instance: ContextStoreService;

  // Các setter functions từ Context API
  private sportHistoryDataSetter: ((data: any) => void) | null = null;
  private sleepHistoryDataSetter: ((data: any) => void) | null = null;
  private heartHistoryDataSetter: ((data: any) => void) | null = null;
  private bloodPressureHistoryDataSetter: ((data: any) => void) | null = null;
  private comprehensiveHistoryDataSetter: ((data: any) => void) | null = null;

  // Dữ liệu hiện tại
  private sportHistoryDataValue: any = null;
  private sleepHistoryDataValue: any = null;
  private heartHistoryDataValue: any = null;
  private bloodPressureHistoryDataValue: any = null;
  private comprehensiveHistoryDataValue: any = null;

  private constructor() {}

  /**
   * Lấy instance của ContextStoreService (Singleton pattern)
   */
  public static getInstance(): ContextStoreService {
    if (!ContextStoreService.instance) {
      ContextStoreService.instance = new ContextStoreService();
    }
    return ContextStoreService.instance;
  }

  // Các setter cho setter functions
  public setSportHistoryDataSetter(setter: (data: any) => void): void {
    this.sportHistoryDataSetter = setter;
  }

  public setSleepHistoryDataSetter(setter: (data: any) => void): void {
    this.sleepHistoryDataSetter = setter;
  }

  public setHeartHistoryDataSetter(setter: (data: any) => void): void {
    this.heartHistoryDataSetter = setter;
  }

  public setBloodPressureHistoryDataSetter(setter: (data: any) => void): void {
    this.bloodPressureHistoryDataSetter = setter;
  }

  public setComprehensiveHistoryDataSetter(setter: (data: any) => void): void {
    this.comprehensiveHistoryDataSetter = setter;
  }

  // Các getter cho dữ liệu hiện tại
  public getSportHistoryData(): any {
    return this.sportHistoryDataValue;
  }

  public getSleepHistoryData(): any {
    return this.sleepHistoryDataValue;
  }

  public getHeartHistoryData(): any {
    return this.heartHistoryDataValue;
  }

  public getBloodPressureHistoryData(): any {
    return this.bloodPressureHistoryDataValue;
  }

  public getComprehensiveHistoryData(): any {
    return this.comprehensiveHistoryDataValue;
  }

  // Các setter cho dữ liệu hiện tại
  public updateSportHistoryData(data: any): void {
    this.sportHistoryDataValue = data;
    if (this.sportHistoryDataSetter) {
      this.sportHistoryDataSetter(data);
    }
  }

  public updateSleepHistoryData(data: any): void {
    this.sleepHistoryDataValue = data;
    if (this.sleepHistoryDataSetter) {
      this.sleepHistoryDataSetter(data);
    }
  }

  public updateHeartHistoryData(data: any): void {
    this.heartHistoryDataValue = data;
    if (this.heartHistoryDataSetter) {
      this.heartHistoryDataSetter(data);
    }
  }

  public updateBloodPressureHistoryData(data: any): void {
    this.bloodPressureHistoryDataValue = data;
    if (this.bloodPressureHistoryDataSetter) {
      this.bloodPressureHistoryDataSetter(data);
    }
  }

  public updateComprehensiveHistoryData(data: any): void {
    this.comprehensiveHistoryDataValue = data;
    if (this.comprehensiveHistoryDataSetter) {
      this.comprehensiveHistoryDataSetter(data);
    }
  }

  /**
   * Lưu dữ liệu theo loại
   * @param data Dữ liệu cần lưu
   * @param type Loại dữ liệu
   */
  public saveData(data: any, type: string): void {
    switch (type) {
      case 'sportHistory':
        this.updateSportHistoryData(data);
        break;
      case 'sleepHistory':
        this.updateSleepHistoryData(data);
        break;
      case 'heartHistory':
        this.updateHeartHistoryData(data);
        break;
      case 'bloodPressureHistory':
        this.updateBloodPressureHistoryData(data);
        break;
      case 'comprehensiveMeasurement':
        this.updateComprehensiveHistoryData(data);
        break;
    }
  }

  /**
   * Lấy tất cả dữ liệu hiện tại
   */
  public getAllData(): {
    sportHistoryData: any;
    sleepHistoryData: any;
    heartHistoryData: any;
    bloodPressureHistoryData: any;
    comprehensiveHistoryData: any;
  } {
    return {
      sportHistoryData: this.sportHistoryDataValue,
      sleepHistoryData: this.sleepHistoryDataValue,
      heartHistoryData: this.heartHistoryDataValue,
      bloodPressureHistoryData: this.bloodPressureHistoryDataValue,
      comprehensiveHistoryData: this.comprehensiveHistoryDataValue
    };
  }
}
