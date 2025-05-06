import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import BleService from '../core/BleService';
import { Constants } from '../constants';

export abstract class BaseHealthService<T> {
  protected dataPackets: Array<Buffer> = [];
  protected isReceivingData: boolean = false;
  protected dataCallback: ((data: T | null) => void) | null = null;
  protected dataTimeoutId: NodeJS.Timeout | null = null;
  
  protected constructor() {}
  
  /**
   * Lấy dữ liệu sức khỏe từ thiết bị
   * @param device Thiết bị BLE đã kết nối
   * @param callback Hàm callback để nhận dữ liệu
   * @param dataCommand Lệnh để lấy dữ liệu cụ thể
   * @param logPrefix Tiền tố cho log
   */
  protected async getData(
    device: Device, 
    callback: (data: T | null) => void, 
    dataCommand: Buffer,
    logPrefix: string
  ): Promise<boolean> {
    if (!device || !device.isConnected) {
      callback(null);
      return false;
    }
    
    this.dataCallback = callback;
    this.dataPackets = [];
    this.isReceivingData = false;
    
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
      
      console.log('Gửi lệnh khởi tạo:', ByteService.bufferToHexString(finalInitCommand), `(Độ dài: ${finalInitCommand.length} bytes)`)
      
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

  /**
   * Xử lý dữ liệu nhận được từ thiết bị
   */
  protected abstract handleCharacteristicUpdate(device: Device, error: Error | null, characteristic: any | null): void;
  
  /**
   * Kiểm tra thời gian chờ dữ liệu và ghép dữ liệu khi hoàn tất
   */
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
        console.log(`Đã nhận ${dataPackets.length} gói dữ liệu ${logPrefix}, tiến hành ghép dữ liệu`);
        
        dataPackets.forEach((packet, index) => {
          console.log(`Gói dữ liệu ${index + 1}: ${ByteService.bufferToHexString(packet)} (Độ dài: ${packet.length} bytes)`);
        });
        
        const combinedData = Buffer.concat(dataPackets);
        const convertToUnit8 = new Uint8Array(combinedData);
        console.log('Dữ liệu dạng Uint8Array:', convertToUnit8);
        onMerge(convertToUnit8);
        this.isReceivingData = false;
      }
    }, 1500); 
  }
}

// Service để đồng bộ tất cả dữ liệu sức khỏe
export class HealthSyncService {
  private static instance: HealthSyncService;
  
  private constructor() {}
  
  public static getInstance(): HealthSyncService {
    if (!HealthSyncService.instance) {
      HealthSyncService.instance = new HealthSyncService();
    }
    return HealthSyncService.instance;
  }
  
  /**
   * Đồng bộ tất cả dữ liệu sức khỏe từ thiết bị
   * @param device Thiết bị BLE đã kết nối
   * @param onProgress Callback để cập nhật tiến trình (0-100)
   * @param onComplete Callback khi hoàn tất tất cả
   */
  public async syncHealthData(
    device: Device, 
    onProgress?: (progress: number, currentService: string) => void,
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
        service: any;
        method: string;
      };
      
      const services: ServiceItem[] = [
        { name: 'Nhịp tim', service: HeartHistoryService.getInstance(), method: 'getHeartData' },
        { name: 'Giấc ngủ', service: SleepService.getInstance(), method: 'getSleepData' },
        { name: 'Thể thao', service: SportService.getInstance(), method: 'getSportData' },
        { name: 'Huyết áp', service: BloodPressureService.getInstance(), method: 'getBloodPressureData' },
        { name: 'Đo tổng hợp', service: ComprehensiveService.getInstance(), method: 'getComprehensiveData' }
      ];
      
      // Đồng bộ tuần tự từng service
      for (let i = 0; i < services.length; i++) {
        const { name, service, method } = services[i];
        const progress = Math.floor((i / services.length) * 100);
        
        if (onProgress) {
          onProgress(progress, name);
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
        onProgress(100, 'Hoàn tất');
      }
      
      if (onComplete) {
        onComplete();
      }
      
      return true;
    } catch (error) {
      console.error('Lỗi khi đồng bộ dữ liệu sức khỏe:', error);
      return false;
    }
  }
}

export default HealthSyncService;
