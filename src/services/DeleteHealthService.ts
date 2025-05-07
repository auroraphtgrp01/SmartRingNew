import { Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Constants } from '../constants';
import { ByteService } from '../core/ByteService';

/**
 * Service quản lý việc xóa lịch sử dữ liệu sức khỏe
 */
export class DeleteHealthService {
  private static instance: DeleteHealthService;

  private constructor() {}
  
  /**
   * Lấy instance của service (Singleton pattern)
   */
  public static getInstance(): DeleteHealthService {
    if (!DeleteHealthService.instance) {
      DeleteHealthService.instance = new DeleteHealthService();
    }
    return DeleteHealthService.instance;
  }
  
  /**
   * Gửi lệnh xóa cho một loại dữ liệu cụ thể
   * @param device Thiết bị BLE đã kết nối
   * @param command Lệnh xóa dữ liệu
   * @param typeName Tên loại dữ liệu (để ghi log)
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  private async sendDeleteCommand(device: Device, command: Uint8Array, typeName: string): Promise<boolean> {
    try {
      const deleteCommand = Buffer.from(command);
      
      await device.writeCharacteristicWithResponseForService(
        Constants.UUID.SERVICE_UUID,
        Constants.UUID.COMMAND_CHARACTERISTIC_UUID,
        deleteCommand.toString('base64')
      );
      
      console.log(`Đã gửi lệnh xóa lịch sử ${typeName}`);
      return true;
    } catch (error) {
      console.error(`Lỗi khi gửi lệnh xóa lịch sử ${typeName}:`, error);
      return false;
    }
  }

  /**
   * Xóa lịch sử dữ liệu thể thao
   * @param device Thiết bị BLE đã kết nối
   * @returns true nếu gửi lệnh thành công, false nếu có lỗi
   */
  public async deleteSportHistory(device: Device): Promise<boolean> {
    if (!device || !device.isConnected) {
      console.error('Không thể xóa dữ liệu: Thiết bị không được kết nối');
      return false;
    }
    
    return this.sendDeleteCommand(device, Constants.COMMAND_BYTE.DELETE_SPORT_HISTORY_COMMAND, 'thể thao');
  }

  /**
   * Xóa tất cả lịch sử dữ liệu sức khỏe (tuần tự, cách nhau 300ms)
   * @param device Thiết bị BLE đã kết nối
   * @param progressCallback Callback theo dõi tiến trình xóa (từ 0-100)
   * @returns true nếu gửi tất cả lệnh thành công, false nếu có bất kỳ lỗi nào
   */
  public async deleteAllHealthData(device: Device, progressCallback?: (progress: number) => void): Promise<boolean> {
    if (!device || !device.isConnected) {
      console.error('Không thể xóa dữ liệu: Thiết bị không được kết nối');
      return false;
    }
    
    try {
      // Danh sách các lệnh xóa và tên loại dữ liệu tương ứng
      const deleteCommands = [
        { command: Constants.COMMAND_BYTE.DELETE_SPORT_HISTORY_COMMAND, name: 'thể thao' },
        { command: Constants.COMMAND_BYTE.DELETE_SLEEP_HISTORY_COMMAND, name: 'giấc ngủ' },
        { command: Constants.COMMAND_BYTE.DELETE_HEART_HISTORY_COMMAND, name: 'nhịp tim' },
        { command: Constants.COMMAND_BYTE.DELETE_BLOOD_PRESSURE_HISTORY_COMMAND, name: 'huyết áp' },
        { command: Constants.COMMAND_BYTE.DELETE_COMPREHENSIVE_MEASUREMENT_COMMAND, name: 'tổng hợp' }
      ];
      
      let success = true;
      
      // Gửi tuần tự các lệnh xóa
      for (let i = 0; i < deleteCommands.length; i++) {
        // Cập nhật tiến trình
        if (progressCallback) {
          progressCallback(Math.floor((i / deleteCommands.length) * 100));
        }
        
        // Gửi lệnh xóa
        const result = await this.sendDeleteCommand(
          device, 
          deleteCommands[i].command, 
          deleteCommands[i].name
        );
        
        if (!result) {
          success = false;
        }
        
        // Chờ 300ms trước khi gửi lệnh tiếp theo
        if (i < deleteCommands.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Cập nhật tiến trình hoàn thành
      if (progressCallback) {
        progressCallback(100);
      }
      
      return success;
    } catch (error) {
      console.error('Lỗi khi xóa tất cả dữ liệu sức khỏe:', error);
      return false;
    }
  }
}

export default DeleteHealthService;
