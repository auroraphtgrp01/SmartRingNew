import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import BleService from '../core/BleService';
import { Constants } from '../constants';

export class HeartHistoryService {
  private static instance: HeartHistoryService;
  private heartDataPackets: Array<Buffer> = [];
  private isReceivingHeartData: boolean = false;
  private heartDataCallback: ((data: any[] | null) => void) | null = null;
  private dataTimeoutId: NodeJS.Timeout | null = null;
  
  private constructor() {}
  
  public static getInstance(): HeartHistoryService {
    if (!HeartHistoryService.instance) {
      HeartHistoryService.instance = new HeartHistoryService();
    }
    return HeartHistoryService.instance;
  }
  
  public async getHeartData(device: Device, callback: (data: any[] | null) => void): Promise<boolean> {
    if (!device || !device.isConnected) {
      callback(null);
      return false;
    }
    
    this.heartDataCallback = callback;
    this.heartDataPackets = [];
    this.isReceivingHeartData = false;
    
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
      
      const heartCommand = Constants.COMMAND_BYTE.GET_HEART_HISTORY;
      const finalHeartCommand = ByteService.createCommandWithCRC(heartCommand);
      
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        finalHeartCommand.toString('base64')
      );
      
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh lấy dữ liệu nhịp tim:', error);
      callback(null);
      return false;
    }
  }

  private handleCharacteristicUpdate(device: Device, error: Error | null, characteristic: any | null): void {
    if (error) {
      console.error('Lỗi khi nhận dữ liệu:', error);
      return;
    }
    
    // Đảm bảo có dữ liệu
    if (!characteristic || !characteristic.value) return;
    
    // Giải mã giá trị nhận được từ Base64
    const buffer = Buffer.from(characteristic.value, 'base64');
    
    console.log(`Nhận dữ liệu từ ${characteristic.uuid}: ${ByteService.bufferToHexString(buffer)} (Độ dài: ${buffer.length} bytes)`);
    
    // Kiểm tra CRC của gói dữ liệu
    if (!ByteService.verifyPacketCRC(buffer)) {
      console.error('CRC không hợp lệ! Bỏ qua gói dữ liệu');
      return;
    }
    
    // Xử lý dữ liệu từ characteristic lệnh (COMMAND_CHARACTERISTIC)
    if (characteristic.uuid.toLowerCase() === Constants.UUID.COMMAND_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói thông tin nhịp tim không (0x0506)
      if (buffer[0] === 0x05 && buffer[1] === 0x06) {
        console.log('Nhận được gói thông tin nhịp tim');
        this.isReceivingHeartData = true;
        this.heartDataPackets = [];
      }
    }
    
    // Xử lý dữ liệu từ characteristic dữ liệu (DATA_CHARACTERISTIC)
    else if (characteristic.uuid.toLowerCase() === Constants.UUID.DATA_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói dữ liệu nhịp tim không (0x0515)
      if (buffer[0] === 0x05 && buffer[1] === 0x15 && this.isReceivingHeartData) {
        console.log('Nhận được gói dữ liệu nhịp tim');
        
        // Lấy độ dài gói
        const length = (buffer[2] << 8) + buffer[3];
        
        // Lấy payload (bỏ header 4 byte và CRC 2 byte cuối)
        const payload = buffer.slice(4, buffer.length - 2);
        
        // Thêm vào mảng gói dữ liệu
        this.heartDataPackets.push(payload);
        
        // Bắt đầu bộ đếm timeout để kiểm tra khi nào dữ liệu hoàn tất
        this.startDataTimeoutCheck((data: any) => {
          if (this.heartDataCallback) {
            this.heartDataCallback(data);
          }
        });
      }
    }
  }
 
  private startDataTimeoutCheck(onMerge: (data: any) => any): void {
    if (this.dataTimeoutId) {
      clearTimeout(this.dataTimeoutId);
    }
    
    this.dataTimeoutId = setTimeout(() => {
      if (this.isReceivingHeartData && this.heartDataPackets.length > 0) {
        console.log(`Đã nhận ${this.heartDataPackets.length} gói dữ liệu nhịp tim, tiến hành ghép dữ liệu`);
        
        this.heartDataPackets.forEach((packet, index) => {
          console.log(`Gói dữ liệu ${index + 1}: ${ByteService.bufferToHexString(packet)} (Độ dài: ${packet.length} bytes)`);
        });
        
        const combinedData = Buffer.concat(this.heartDataPackets);
        const convertToUnit8 = new Uint8Array(combinedData);
        console.log('Dữ liệu dạng Uint8Array:', convertToUnit8);
        onMerge(convertToUnit8);
        this.isReceivingHeartData = false;
      }
    }, 1500); 
  }
}

export default HeartHistoryService;
