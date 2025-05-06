export class SyncHealthDataIntoCloud {
    private static instance: SyncHealthDataIntoCloud;

    public static sportHistoryData: any;
    public static sleepHistoryData: any;
    public static heartHistoryData: any;
    public static bloodPressureHistoryData: any;
    public static comprehensiveMeasurementData: any;

    private constructor() {}

    public static getInstance(): SyncHealthDataIntoCloud {
        if (!SyncHealthDataIntoCloud.instance) {
            SyncHealthDataIntoCloud.instance = new SyncHealthDataIntoCloud();
        }
        return SyncHealthDataIntoCloud.instance;
    }

    public saveLocallyData(data: any, type: string) {
        switch (type) {
            case 'sportHistory':
                SyncHealthDataIntoCloud.sportHistoryData = data;
                break;
            case 'sleepHistory':
                SyncHealthDataIntoCloud.sleepHistoryData = data;
                break;
            case 'heartHistory':
                SyncHealthDataIntoCloud.heartHistoryData = data;
                break;
            case 'bloodPressureHistory':
                SyncHealthDataIntoCloud.bloodPressureHistoryData = data;
                break;
            case 'comprehensiveMeasurement':
                SyncHealthDataIntoCloud.comprehensiveMeasurementData = data;
                break;
        }
    }

    public startSync() {
        console.log('Bắt đầu đồng bộ dữ liệu vào cloud');
        console.log('Dữ liệu thể thao:', SyncHealthDataIntoCloud.sportHistoryData);
        console.log('Dữ liệu giấc ngủ:', SyncHealthDataIntoCloud.sleepHistoryData);
        console.log('Dữ liệu nhịp tim:', SyncHealthDataIntoCloud.heartHistoryData);
        console.log('Dữ liệu huyết áp:', SyncHealthDataIntoCloud.bloodPressureHistoryData);
        console.log('Dữ liệu đo tổng hợp:', SyncHealthDataIntoCloud.comprehensiveMeasurementData);
    }
}
