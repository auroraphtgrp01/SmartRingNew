import { Device, Characteristic } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { ByteService } from '../core/ByteService';
import { Constants } from '../constants';
import { BaseHealthService } from './BaseHealthService';

export class SportService extends BaseHealthService<any[]> {
  private static instance: SportService;
  public static DATATYPE = 2
  
  private constructor() {
    super();
  }
  
  public static getInstance(): SportService {
    if (!SportService.instance) {
      SportService.instance = new SportService();
    }
    return SportService.instance;
  }
  
  public async getSportData(device: Device, callback: (data: any[] | null) => void): Promise<boolean> {
    const sportCommand = Buffer.from(Constants.COMMAND_BYTE.GET_SPORT_HISTORY);
    return this.getData(device, callback, sportCommand, 'thể thao', SportService.DATATYPE);
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
    
    // Kiểm tra độ dài gói dữ liệu, nếu nhỏ hơn 9 byte thì trả về ngay
    if (buffer.length < 9) {
      console.log(`Gói dữ liệu quá ngắn (${buffer.length} bytes), trả về ngay`);
      if (this.dataCallback && buffer[0] === 0x05 && buffer[1] === 0x02) {
        console.log('Gọi callback trực tiếp cho gói dữ liệu thể thao ngắn');
        this.dataCallback([]);
      }
      return;
    }
    
    // Xử lý dữ liệu từ characteristic lệnh (COMMAND_CHARACTERISTIC)
    if (characteristic.uuid.toLowerCase() === Constants.UUID.COMMAND_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói thông tin thể thao không (0x0502)
      if (buffer[0] === 0x05 && buffer[1] === 0x02) {
        console.log('Nhận được gói thông tin thể thao');
        this.isReceivingData = true;
        this.dataPackets = [];
      }
    }
    
    // Xử lý dữ liệu từ characteristic dữ liệu (DATA_CHARACTERISTIC)
    else if (characteristic.uuid.toLowerCase() === Constants.UUID.DATA_CHARACTERISTIC_UUID.toLowerCase()) {
      // Kiểm tra xem có phải gói dữ liệu thể thao không (0x0511)
      if (buffer[0] === 0x05 && buffer[1] === 0x11 && this.isReceivingData) {
        console.log('Nhận được gói dữ liệu thể thao');
        
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
        }, 'thể thao');
      }
    }
  }
 

}

export default SportService;
