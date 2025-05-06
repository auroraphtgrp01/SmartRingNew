import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DeviceItem from './DeviceItem';

interface DeviceScannerProps {
  isScanning: boolean;
  devices: Device[];
  onStartScan: () => void;
  onConnectDevice: (device: Device) => void;
  isConnecting: boolean;
  onBack: () => void;
  onDisconnectDevice: () => void;
}

const DeviceScanner: React.FC<DeviceScannerProps> = ({
  isScanning,
  devices,
  onStartScan,
  onConnectDevice,
  isConnecting,
  onBack,
  onDisconnectDevice
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Tìm thiết bị</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.scanButton} 
          onPress={onStartScan}
          disabled={isScanning}
          activeOpacity={0.8}
        >
          {isScanning ? (
            <View style={styles.scanningContent}>
              <ActivityIndicator color="white" style={styles.spinner} />
              <Text style={styles.buttonText}>Đang quét...</Text>
            </View>
          ) : (
            <View style={styles.scanningContent}>
              <Text style={styles.buttonText}>Quét thiết bị</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.clearButton} 
          onPress={onDisconnectDevice}
          activeOpacity={0.8}
        >
          <View style={styles.scanningContent}>
            <MaterialCommunityIcons name="bluetooth-off" size={18} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Clear Connect</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.deviceListContainer}>
        {devices.length > 0 ? (
          <>
            <Text style={styles.listTitle}>
              Đã tìm thấy {devices.length} thiết bị
            </Text>
            <FlatList
              data={devices}
              renderItem={({ item }) => (
                <DeviceItem 
                  device={item} 
                  onPress={onConnectDevice} 
                  isConnecting={isConnecting} 
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <View style={styles.emptyList}>
            {!isScanning && (
              <>
                <MaterialCommunityIcons name={"devices" as any} size={50} color="#D4D4D4" />
                <Text style={styles.emptyText}>Chưa tìm thấy thiết bị nào</Text>
                <Text style={styles.emptySubText}>Hãy bấm quét để tìm thiết bị của bạn</Text>
              </>
            )}
            {isScanning && (
              <ActivityIndicator size="large" color="#40A9FF" />
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  scanButton: {
    flex: 1,
    backgroundColor: '#40A9FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#40A9FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#FB6F92',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FB6F92',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  scanningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    marginRight: 10,
  },
  deviceListContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default DeviceScanner; 