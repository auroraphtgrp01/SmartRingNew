import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import { Constants } from '../constants';
import { BaseHealthService } from './BaseHealthService';

export class HeartHistoryService extends BaseHealthService<any[]> {
  private static instance: HeartHistoryService;
  public static DATATYPE = 6

  private constructor() {
    super();
  }
  
  public static getInstance(): HeartHistoryService {
    if (!HeartHistoryService.instance) {
      HeartHistoryService.instance = new HeartHistoryService();
    }
    return HeartHistoryService.instance;
  }
  
  public async getHeartData(device: Device, callback: (data: any[] | null) => void): Promise<boolean> {
    const heartCommand = Buffer.from(Constants.COMMAND_BYTE.GET_HEART_HISTORY);
    return this.getData(device, callback, heartCommand, 'nhịp tim', HeartHistoryService.DATATYPE);
  }

  protected handleCharacteristicUpdate(device: Device, error: Error | null, characteristic: any | null): void {
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
        this.isReceivingData = true;
        this.dataPackets = [];
      }
    }
    
    // Xử lý dữ liệu từ characteristic dữ liệu (DATA_CHARACTERISTIC)
    else if (characteristic.uuid.toLowerCase() === Constants.UUID.DATA_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói dữ liệu nhịp tim không (0x0515)
      if (buffer[0] === 0x05 && buffer[1] === 0x15 && this.isReceivingData) {
        console.log('Nhận được gói dữ liệu nhịp tim');
        
        // Lấy độ dài gói
        const length = (buffer[2] << 8) + buffer[3];
        
        // Lấy payload (bỏ header 4 byte và CRC 2 byte cuối)
        const payload = buffer.slice(4, buffer.length - 2);
        
        // Thêm vào mảng gói dữ liệu
        this.dataPackets.push(payload);
        
        // Bắt đầu bộ đếm timeout để kiểm tra khi nào dữ liệu hoàn tất
        this.startDataTimeoutCheck(this.isReceivingData, this.dataPackets, (data: any) => {
          if (this.dataCallback) {
            this.dataCallback(data);
          }
        }, 'nhịp tim');
      }
    }
  }
 

}

export default HeartHistoryService;
