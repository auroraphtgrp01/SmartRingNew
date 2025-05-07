import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import { Constants } from '../constants';
import { unpackHealthData } from '../core/UnpackData';
import { FinalDataService } from './FinalDataService';
import { SyncHealthDataIntoCloud } from './SyncHealthDataIntoCloud';
// Không import BleService trực tiếp để tránh chu trình yêu cầu

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
      // Sử dụng require để tránh chu trình yêu cầu
      const BleService = require('../core/BleService').default;
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

  // Hàng đợi xử lý dữ liệu để tách biệt quá trình nhận và xử lý dữ liệu
  private static dataProcessingQueue: Array<{data: Uint8Array, dataType: number}> = [];
  private static isProcessingQueue: boolean = false;
  
  // Xử lý hàng đợi dữ liệu
  private static processDataQueue(): void {
    if (BaseHealthService.isProcessingQueue || BaseHealthService.dataProcessingQueue.length === 0) {
      return;
    }
    
    BaseHealthService.isProcessingQueue = true;
    
    // Lấy dữ liệu từ hàng đợi
    const item = BaseHealthService.dataProcessingQueue.shift();
    if (item) {
      try {
        // Xử lý dữ liệu
        const unpackedData = unpackHealthData(item.data, item.dataType);
        
        // Xử lý và lưu trữ dữ liệu
        const finalDataInstance = FinalDataService.getInstance();
        const syncDataInstance = SyncHealthDataIntoCloud.getInstance();
        
        // Định nghĩa các loại dữ liệu và cách xử lý tương ứng
        const dataTypeMap: Record<number, { process: (data: Record<string, any>) => any, key: string }> = {
          [Constants.DATA_TYPE.sleepHistory]: { 
            process: (data) => finalDataInstance.getFinalSleepData(data), 
            key: 'sleepHistory' 
          },
          [Constants.DATA_TYPE.sportHistory]: { 
            process: (data) => finalDataInstance.getFinalSportData(data), 
            key: 'sportHistory' 
          },
          [Constants.DATA_TYPE.heartHistory]: { 
            process: (data) => finalDataInstance.getFinalHeartData(data), 
            key: 'heartHistory' 
          },
          [Constants.DATA_TYPE.bloodPressureHistory]: { 
            process: (data) => finalDataInstance.getFinalBloodPressureData(data), 
            key: 'bloodPressureHistory' 
          },
          [Constants.DATA_TYPE.comprehensiveMeasurement]: { 
            process: (data) => finalDataInstance.getFinalComprehensiveMeasurementData(data), 
            key: 'comprehensiveMeasurement' 
          }
        };
        
        // Xử lý dữ liệu theo loại
        const handler = dataTypeMap[item.dataType];
        if (handler) {
          const finalData = handler.process(unpackedData);
          // Lưu dữ liệu vào bộ nhớ cục bộ
          syncDataInstance.saveLocallyData(finalData, handler.key);
        }
      } catch (error) {
        console.error(`Lỗi khi xử lý dữ liệu trong hàng đợi:`, error);
      } finally {
        // Đánh dấu đã xử lý xong và tiếp tục với dữ liệu tiếp theo
        BaseHealthService.isProcessingQueue = false;
        setTimeout(() => BaseHealthService.processDataQueue(), 0);
      }
    } else {
      BaseHealthService.isProcessingQueue = false;
    }
  }
  
  protected startDataTimeoutCheck(
    isReceivingData: boolean,
    dataPackets: Array<Buffer>,
    onMerge: (data: any) => any,
    logPrefix: string
  ): void {
    // Nếu đã có timeout trước đó, hủy nó
    if (this.dataTimeoutId) {
      clearTimeout(this.dataTimeoutId);
    }
    
    // Thời gian chờ ngắn hơn để xử lý dữ liệu nhanh hơn
    // Nếu có gói dữ liệu mới đến, timeout sẽ được reset
    this.dataTimeoutId = setTimeout(() => {
      if (isReceivingData) {
        if (dataPackets.length > 0) {
          // Kết hợp tất cả các gói dữ liệu thành một buffer duy nhất
          const combinedData = Buffer.concat(dataPackets);
          const convertToUnit8 = new Uint8Array(combinedData);
          
          // Đánh dấu đã nhận xong dữ liệu
          this.isReceivingData = false;
          
          // Gọi callback ngay lập tức để tiếp tục quy trình đồng bộ
          onMerge(convertToUnit8);
          
          // Thêm dữ liệu vào hàng đợi xử lý thay vì xử lý ngay
          BaseHealthService.dataProcessingQueue.push({
            data: convertToUnit8,
            dataType: this.dataType
          });
          
          // Bắt đầu xử lý hàng đợi nếu chưa xử lý
          setTimeout(() => BaseHealthService.processDataQueue(), 0);
        } else {
          // Trường hợp không có dữ liệu nhưng đã nhận được thông báo từ thiết bị
          console.log(`Không có dữ liệu ${logPrefix} để đồng bộ`);
          onMerge([]);
          this.isReceivingData = false;
        }
      }
    }, 500); // Giảm thời gian timeout để xử lý nhanh hơn
  }

  // Phương thức này không còn được sử dụng trực tiếp
  // Giữ lại để tương thích với các lớp con
  protected handleUnpackData(data: Uint8Array, dataType: number): void {
    // Không thực hiện xử lý dữ liệu ở đây nữa
    // Tất cả xử lý dữ liệu được chuyển sang hàng đợi xử lý
    console.log(`Phương thức handleUnpackData không còn được sử dụng trực tiếp`);
  }

  // Phương thức này không còn được sử dụng trực tiếp
  // Giữ lại để tương thích với các lớp con
  protected handleMappingData(data: Record<string, any>, dataType: number): void {
    // Không thực hiện xử lý dữ liệu ở đây nữa
    // Tất cả xử lý dữ liệu được chuyển sang hàng đợi xử lý
    console.log(`Phương thức handleMappingData không còn được sử dụng trực tiếp`);
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
        priority: number; // Mức độ ưu tiên (số càng thấp càng ưu tiên cao)
      };
      
      const services: ServiceItem[] = [
        { name: 'Nhịp tim', dataType: HeartHistoryService.DATATYPE, service: HeartHistoryService.getInstance(), method: 'getHeartData', priority: 1 },
        { name: 'Giấc ngủ', dataType: SleepService.DATATYPE, service: SleepService.getInstance(), method: 'getSleepData', priority: 2 },
        { name: 'Thể thao', dataType: SportService.DATATYPE, service: SportService.getInstance(), method: 'getSportData', priority: 3 },
        { name: 'Huyết áp', dataType: BloodPressureService.DATATYPE, service: BloodPressureService.getInstance(), method: 'getBloodPressureData', priority: 4 },
        { name: 'Đo tổng hợp', dataType: ComprehensiveService.DATATYPE, service: ComprehensiveService.getInstance(), method: 'getComprehensiveData', priority: 5 }
      ];
      
      // Sắp xếp lại theo thứ tự ưu tiên
      services.sort((a, b) => a.priority - b.priority);
      
      // Thiết lập timeout tổng thể cho quá trình đồng bộ
      const syncTimeout = setTimeout(() => {
        console.log('Đã hết thời gian đồng bộ, tiến hành đồng bộ lên cloud');
        if (onProgress) {
          onProgress(100, 'Hoàn tất (timeout)', 0);
        }
        
        // Đợi thêm 1 giây để đảm bảo hàng đợi xử lý dữ liệu đã hoàn thành
        setTimeout(() => {
          const syncDataInstance = SyncHealthDataIntoCloud.getInstance();
          syncDataInstance.startSync(() => {
            if(onComplete){
              onComplete();
            }
          });
        }, 1000);
      }, 25000); // Giảm timeout tổng thể xuống 25 giây
      
      // Khởi tạo mảng để theo dõi các service đã hoàn thành
      const completedServices = new Set<string>();
      
      // Tạo mảng promises cho tất cả các service
      const servicePromises = services.map(({ name, dataType, service, method }, index) => {
        return async () => {
          const progress = Math.floor((index / services.length) * 100);
          if (onProgress) {
            onProgress(progress, name, dataType);
          }
          
          try {
            // Thiết lập timeout cho mỗi service
            const servicePromise = new Promise<void>((resolve) => {
              (service as any)[method](device, (data: any) => {
                console.log(`Đã đồng bộ dữ liệu ${name}`);
                completedServices.add(name);
                resolve();
              });
            });
            
            // Đợi service hiện tại với timeout
            const timeoutPromise = new Promise<void>((resolve) => {
              setTimeout(() => {
                console.log(`Hết thời gian chờ đồng bộ dữ liệu ${name}, chuyển sang dịch vụ tiếp theo`);
                resolve();
              }, 5000); // Giảm timeout xuống 5 giây cho mỗi service
            });
            
            // Đợi service hoàn thành hoặc hết thời gian
            await Promise.race([servicePromise, timeoutPromise]);
          } catch (serviceError) {
            console.error(`Lỗi khi đồng bộ dữ liệu ${name}:`, serviceError);
          }
        };
      });
      
      // Thực hiện các service theo thứ tự ưu tiên, nhưng không chờ quá lâu
      for (const servicePromise of servicePromises) {
        await servicePromise();
        // Chỉ đợi 100ms giữa các service để tăng tốc độ
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Hủy timeout tổng thể vì đã hoàn thành
      clearTimeout(syncTimeout);
      
      if (onProgress) {
        onProgress(100, 'Hoàn tất', 0);
      }
      
      console.log(`Đã đồng bộ ${completedServices.size}/${services.length} dịch vụ`);
      
      // Đợi thêm 500ms để đảm bảo hàng đợi xử lý dữ liệu đã hoàn thành
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Đồng bộ dữ liệu lên cloud
      const syncDataInstance = SyncHealthDataIntoCloud.getInstance();
      syncDataInstance.startSync(() => {
        if(onComplete){
          onComplete();
        }
      });
      
      return true;
    } catch (error) {
      console.error('Lỗi khi đồng bộ dữ liệu sức khỏe:', error);
      if (onComplete) {
        onComplete();
      }
      return false;
    }
  }
}

export default HealthSyncService;
