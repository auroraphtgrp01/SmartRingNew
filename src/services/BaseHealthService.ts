import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import BleService from '../core/BleService';
import { Constants } from '../constants';
import { unpackHealthData } from '../core/UnpackData';
import { FinalDataService } from './FinalDataService';
import { SyncHealthDataIntoCloud } from './SyncHealthDataIntoCloud';

export abstract class BaseHealthService<T> {
  protected dataPackets: Array<Buffer> = [];
  protected isReceivingData: boolean = false;
  protected dataCallback: ((data: T | null) => void) | null = null;
  protected dataTimeoutId: NodeJS.Timeout | null = null;
  protected dataType: number = 0;

  protected abstract handleCharacteristicUpdate(device: Device, error: Error | null, characteristic: any | null): void;
  
  protected constructor() {}
 
  protected async getData(
    device: Device, 
    callback: (data: T | null) => void, 
    dataCommand: Buffer,
    logPrefix: string,
    dataType: number
  ): Promise<boolean> {
    if (!device || !device.isConnected) {
      callback(null);
      return false;
    }
    
    this.dataCallback = callback;
    this.dataPackets = [];
    this.isReceivingData = false;
    this.dataType = dataType;
    
    try {
      await BleService.getInstance().setupNotifications();
      
      device.monitorCharacteristicForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      device.monitorCharacteristicForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.DATA_CHARACTERISTIC_UUID,
        this.handleCharacteristicUpdate.bind(this, device)
      );
      
      const initCommand = Constants.COMMAND_BYTE.INIT_HEALTH_BLOCK;
      const finalInitCommand = ByteService.createCommandWithCRC(initCommand);
      
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        finalInitCommand.toString('base64')
      );
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const finalDataCommand = ByteService.createCommandWithCRC(dataCommand);
      
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        finalDataCommand.toString('base64')
      );
      
      return true;
    } catch (error) {
      console.error(`Lỗi khi gửi lệnh lấy dữ liệu ${logPrefix}:`, error);
      callback(null);
      return false;
    }
  }

  protected startDataTimeoutCheck(
    isReceivingData: boolean,
    dataPackets: Array<Buffer>,
    onMerge: (data: any) => any,
    logPrefix: string
  ): void {
    if (this.dataTimeoutId) {
      clearTimeout(this.dataTimeoutId);
    }
    
    this.dataTimeoutId = setTimeout(() => {
      if (isReceivingData && dataPackets.length > 0) {
        // console.log(`Đã nhận ${dataPackets.length} gói dữ liệu ${logPrefix}, tiến hành ghép dữ liệu`);
        
        dataPackets.forEach((packet, index) => {
          // console.log(`Độ dài: ${packet.length} bytes`);
        });
        
        const combinedData = Buffer.concat(dataPackets);
        const convertToUnit8 = new Uint8Array(combinedData);
        // console.log('Dữ liệu dạng Uint8Array:', convertToUnit8);
        onMerge(convertToUnit8);
        this.isReceivingData = false;
        this.handleUnpackData(convertToUnit8, this.dataType);
      }
    }, 1500); 
  }

  protected handleUnpackData(data: Uint8Array, dataType: number) {
    const unpackedData = unpackHealthData(data, dataType);
    this.handleMappingData(unpackedData, dataType);
  }

  protected handleMappingData(data: Record<string, any>, dataType: number) {
    const finalDataInstance = FinalDataService.getInstance();
    const syncDataInstance = SyncHealthDataIntoCloud.getInstance();
    switch (dataType) {
      case Constants.DATA_TYPE.sleepHistory:
        const finalSleepData = finalDataInstance.getFinalSleepData(data)
        // console.log('Dữ liệu giấc ngủ:', finalSleepData);
        syncDataInstance.saveLocallyData(finalSleepData, 'sleepHistory');
        break;
      case Constants.DATA_TYPE.sportHistory:
        const finalSportData = finalDataInstance.getFinalSportData(data)
        // console.log('Dữ liệu thể thao:', finalSportData);
        syncDataInstance.saveLocallyData(finalSportData, 'sportHistory');
        break;
      case Constants.DATA_TYPE.heartHistory:
        const finalHeartData = finalDataInstance.getFinalHeartData(data)
        // console.log('Dữ liệu nhịp tim:', finalHeartData);
        syncDataInstance.saveLocallyData(finalHeartData, 'heartHistory');
        break;
      case Constants.DATA_TYPE.bloodPressureHistory:
        const finalBloodPressureData = finalDataInstance.getFinalBloodPressureData(data)
        // console.log('Dữ liệu huyết áp:', finalBloodPressureData);
        syncDataInstance.saveLocallyData(finalBloodPressureData, 'bloodPressureHistory');
        break;
      case Constants.DATA_TYPE.comprehensiveMeasurement:
        const finalComprehensiveData = finalDataInstance.getFinalComprehensiveMeasurementData(data)
        // console.log('Dữ liệu đo tổng hợp:', finalComprehensiveData);  
        syncDataInstance.saveLocallyData(finalComprehensiveData, 'comprehensiveMeasurement');
        break;
    }
  }
}

export class HealthSyncService {
  private static instance: HealthSyncService;
  
  private constructor() {}
  
  public static getInstance(): HealthSyncService {
    if (!HealthSyncService.instance) {
      HealthSyncService.instance = new HealthSyncService();
    }
    return HealthSyncService.instance;
  }
  
  public async syncHealthData(
    device: Device, 
    onProgress?: (progress: number, currentService: string, dataType: number) => void,
    onComplete?: () => void
  ): Promise<boolean> {
    if (!device || !device.isConnected) {
      return false;
    }
    
    try {
      // Import các service (sử dụng require thay vì dynamic import)
      const HeartHistoryService = require('./HeartHistoryService').default;
      const SleepService = require('./SleepService').default;
      const SportService = require('./SportService').default;
      const BloodPressureService = require('./BloodPressureService').default;
      const ComprehensiveService = require('./ComprehensiveService').default;
      
      // Danh sách các service cần đồng bộ
      type ServiceItem = {
        name: string;
        dataType: number;
        service: any;
        method: string;
      };
      
      const services: ServiceItem[] = [
        { name: 'Nhịp tim', dataType: HeartHistoryService.DATATYPE, service: HeartHistoryService.getInstance(), method: 'getHeartData' },
        { name: 'Giấc ngủ', dataType: SleepService.DATATYPE, service: SleepService.getInstance(), method: 'getSleepData' },
        { name: 'Thể thao', dataType: SportService.DATATYPE, service: SportService.getInstance(), method: 'getSportData' },
        { name: 'Huyết áp', dataType: BloodPressureService.DATATYPE, service: BloodPressureService.getInstance(), method: 'getBloodPressureData' },
        { name: 'Đo tổng hợp', dataType: ComprehensiveService.DATATYPE, service: ComprehensiveService.getInstance(), method: 'getComprehensiveData' }
      ];
      
      // Đồng bộ tuần tự từng service
      for (let i = 0; i < services.length; i++) {
        const { name, dataType, service, method } = services[i];
        const progress = Math.floor((i / services.length) * 100);
        
        if (onProgress) {
          onProgress(progress, name, dataType);
        }

        // Đợi dữ liệu từ service hiện tại
        await new Promise<void>((resolve) => {
          (service as any)[method](device, (data: any) => {
            console.log(`Đã đồng bộ dữ liệu ${name}`);
            resolve();
          });
        });
        
        // Đợi một khoảng thời gian trước khi gọi service tiếp theo
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (onProgress) {
        onProgress(100, 'Hoàn tất', 0);
      }
      
      if (onComplete) {
        onComplete();
      }
      
      const syncDataInstance = SyncHealthDataIntoCloud.getInstance();
      syncDataInstance.startSync();
      
      return true;
    } catch (error) {
      console.error('Lỗi khi đồng bộ dữ liệu sức khỏe:', error);
      return false;
    }
  }
}

export default HealthSyncService;
