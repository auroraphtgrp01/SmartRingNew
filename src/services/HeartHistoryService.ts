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
    
    // Kiểm tra CRC của gói dữ liệu
    if (!ByteService.verifyPacketCRC(buffer)) {
      console.error('CRC không hợp lệ! Bỏ qua gói dữ liệu');
      return;
    }
    
    // Kiểm tra độ dài gói dữ liệu, nếu nhỏ hơn 9 byte thì trả về ngay
    if (buffer.length < 9) {
      console.log(`Gói dữ liệu quá ngắn (${buffer.length} bytes), trả về ngay`);
      if (this.dataCallback && buffer[0] === 0x05 && buffer[1] === 0x06) {
        console.log('Gọi callback trực tiếp cho gói dữ liệu nhịp tim ngắn');
        this.dataCallback([]);
      }
      return;
    }
    
    // Xử lý dữ liệu từ characteristic lệnh (COMMAND_CHARACTERISTIC)
    if (characteristic.uuid.toLowerCase() === Constants.UUID.COMMAND_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói thông tin nhịp tim không (0x0506)
      if (buffer[0] === 0x05 && buffer[1] === 0x06) {
        console.log(`Nhận gói dữ liệu nhịp tim: ${Buffer.from(buffer).toString('hex')}`);
        this.isReceivingData = true;
        this.dataPackets = [];
        
        // Kiểm tra xem có dữ liệu hay không (dựa vào byte thứ 3 và 4)
        const dataLength = (buffer[2] << 8) + buffer[3];
        if (dataLength === 0) {
          console.log('Không có dữ liệu nhịp tim để đồng bộ');
          // Gọi callback trực tiếp khi không có dữ liệu
          if (this.dataCallback) {
            console.log('Gọi callback trực tiếp cho dữ liệu nhịp tim trống');
            this.dataCallback([]);
          }
          this.isReceivingData = false;
        }
      } else {
        console.log('Không nhận được gói dữ liệu nhịp tim');
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
        // Sử dụng cơ chế hàng đợi xử lý dữ liệu mới, không đợi unpack
        this.startDataTimeoutCheck(this.isReceivingData, this.dataPackets, (data: any) => {
          if (this.dataCallback) {
            // Gọi callback ngay để tiếp tục quy trình đồng bộ, không đợi unpack
            this.dataCallback(data);
          }
        }, 'nhịp tim');
      }
    } 
  }
 

}

export default HeartHistoryService;
