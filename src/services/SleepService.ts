import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import BleService from '../core/BleService';
import { Constants } from '../constants';

export class SleepService {
  private static instance: SleepService;
  private sleepDataPackets: Array<Buffer> = [];
  private isReceivingSleepData: boolean = false;
  private sleepDataCallback: ((data: any[] | null) => void) | null = null;
  private dataTimeoutId: NodeJS.Timeout | null = null;
  
  private constructor() {}
  
  public static getInstance(): SleepService {
    if (!SleepService.instance) {
      SleepService.instance = new SleepService();
    }
    return SleepService.instance;
  }
  
  public async getSleepData(device: Device, callback: (data: any[] | null) => void): Promise<boolean> {
    if (!device || !device.isConnected) {
      callback(null);
      return false;
    }
    
    this.sleepDataCallback = callback;
    this.sleepDataPackets = [];
    this.isReceivingSleepData = false;
    
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
      
      const sleepCommand = Constants.COMMAND_BYTE.GET_SLEEP_HISTORY;
      const finalSleepCommand = ByteService.createCommandWithCRC(sleepCommand);
      
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        finalSleepCommand.toString('base64')
      );
      
      return true;
    } catch (error) {
      console.error('Lỗi khi gửi lệnh lấy dữ liệu giấc ngủ:', error);
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
      // Kiểm tra xem có phải gói thông tin giấc ngủ không (0x0504)
      if (buffer[0] === 0x05 && buffer[1] === 0x04) {
        console.log('Nhận được gói thông tin giấc ngủ');
        this.isReceivingSleepData = true;
        this.sleepDataPackets = [];
      }
    }
    
    // Xử lý dữ liệu từ characteristic dữ liệu (DATA_CHARACTERISTIC)
    else if (characteristic.uuid.toLowerCase() === Constants.UUID.DATA_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói dữ liệu giấc ngủ không (0x0513)
      if (buffer[0] === 0x05 && buffer[1] === 0x13 && this.isReceivingSleepData) {
        console.log('Nhận được gói dữ liệu giấc ngủ');
        
        // Lấy độ dài gói
        const length = (buffer[2] << 8) + buffer[3];
        
        // Lấy payload (bỏ header 4 byte và CRC 2 byte cuối)
        const payload = buffer.slice(4, buffer.length - 2);
        
        // Thêm vào mảng gói dữ liệu
        this.sleepDataPackets.push(payload);
        
        // Bắt đầu bộ đếm timeout để kiểm tra khi nào dữ liệu hoàn tất
        this.startDataTimeoutCheck();
      }
    }
  }
 
  private startDataTimeoutCheck(): void {
    // Xóa timeout hiện tại nếu có
    if (this.dataTimeoutId) {
      clearTimeout(this.dataTimeoutId);
    }
    
    // Đặt timeout mới - nếu không có gói mới trong 3 giây, coi như đã nhận đủ dữ liệu
    this.dataTimeoutId = setTimeout(() => {
      if (this.isReceivingSleepData && this.sleepDataPackets.length > 0) {
        console.log(`Đã nhận ${this.sleepDataPackets.length} gói dữ liệu giấc ngủ, tiến hành ghép dữ liệu`);
        
        // Log kích thước của mỗi gói dữ liệu
        this.sleepDataPackets.forEach((packet, index) => {
          console.log(`Gói dữ liệu ${index + 1}: ${ByteService.bufferToHexString(packet)} (Độ dài: ${packet.length} bytes)`);
        });
        
        // Kết hợp tất cả các gói lại
        const combinedData = Buffer.concat(this.sleepDataPackets);
        console.log(`Dữ liệu sau khi ghép: ${ByteService.bufferToHexString(combinedData)} (Tổng độ dài: ${combinedData.length} bytes)`);
        
        // Lưu trữ dữ liệu đã ghép để sử dụng sau (nếu cần)
        // Có thể thêm các bước phân tích dữ liệu sau này
        
        // Gọi callback với dữ liệu đã ghép hoặc null
        if (this.sleepDataCallback) {
          // Gọi với null vì chưa phân tích dữ liệu
          this.sleepDataCallback(null);
        }
        
        this.isReceivingSleepData = false;
      }
    }, 1500); 
  }
}

export default SleepService;
