import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ConnectedDeviceProps {
  device: Device;
  onDisconnect: () => void;
  isFetching: boolean;
  onGetSleepData: () => void;
  onGetSportData: () => void;
  onGetHeartData: () => void;
  onGetBloodPressureData: () => void;
  onStartSpo2: () => void;
  onStartHeartRate: () => void;
  onGetDeviceInfo: () => void;
  onSyncHealthData: () => void;
  onGetComprehensiveData: () => void;
}

interface ActionButtonProps {
  title: string;
  icon: string;
  onPress: () => void;
  isLoading?: boolean;
  color?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ title, icon, onPress, isLoading = false, color = '#40A9FF' }) => (
  <TouchableOpacity 
    style={[styles.actionButton, { backgroundColor: color }]} 
    onPress={onPress}
    disabled={isLoading}
    activeOpacity={0.8}
  >
    {isLoading ? (
      <ActivityIndicator size="small" color="white" />
    ) : (
      <>
        <MaterialCommunityIcons name={icon as any} size={22} color="white" style={styles.actionIcon} />
        <Text style={styles.actionText}>{title}</Text>
      </>
    )}
  </TouchableOpacity>
);

const ConnectedDevice: React.FC<ConnectedDeviceProps> = ({
  device,
  onDisconnect,
  isFetching,
  onGetSleepData,
  onGetSportData,
  onGetHeartData,
  onGetBloodPressureData,
  onStartSpo2,
  onStartHeartRate,
  onGetDeviceInfo,
  onSyncHealthData,
  onGetComprehensiveData
}) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.deviceInfoContainer}>
          <View style={styles.deviceIconContainer}>
            <MaterialCommunityIcons name="watch" size={30} color="#40A9FF" />
          </View>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{device.name || "Smart Ring"}</Text>
            <View style={styles.connectionStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Đã kết nối</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Đo lường</Text>
        <View style={styles.actionsRow}>
          <ActionButton
            title="Đo nhịp tim"
            icon="heart-pulse"
            onPress={onStartHeartRate}
            isLoading={isFetching}
            color="#FB6F92"
          />
          <ActionButton
            title="Đo SpO2"
            icon="water-percent"
            onPress={onStartSpo2}
            isLoading={isFetching}
            color="#95DE64"
          />
        </View>

        <Text style={styles.sectionTitle}>Dữ liệu sức khỏe</Text>
        <View style={styles.actionsGrid}>
          <ActionButton 
            title="Giấc ngủ" 
            icon="sleep"
            onPress={onGetSleepData}
            isLoading={isFetching}
          />
          <ActionButton 
            title="Thể thao" 
            icon="run"
            onPress={onGetSportData}
            isLoading={isFetching}
          />
          <ActionButton 
            title="Nhịp tim" 
            icon="heart"
            onPress={onGetHeartData}
            isLoading={isFetching}
          />
          <ActionButton 
            title="Huyết áp" 
            icon="pulse"
            onPress={onGetBloodPressureData}
            isLoading={isFetching}
          />
        </View>

        <Text style={styles.sectionTitle}>Thông tin & Đồng bộ</Text>
        <View style={styles.actionsRow}>
          <ActionButton 
            title="Thông tin thiết bị" 
            icon="information-outline"
            onPress={onGetDeviceInfo}
            isLoading={isFetching}
          />
          <ActionButton 
            title="Đồng bộ dữ liệu" 
            icon="sync"
            onPress={onSyncHealthData}
            isLoading={isFetching}
          />
        </View>

        <ActionButton 
          title="Dữ liệu tổng hợp" 
          icon="chart-box"
          onPress={onGetComprehensiveData}
          isLoading={isFetching}
          color="#36CFC9"
        />

        <TouchableOpacity style={styles.disconnectButton} onPress={onDisconnect}>
          <MaterialCommunityIcons name="bluetooth-off" size={22} color="white" />
          <Text style={styles.disconnectText}>Ngắt kết nối</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#52C41A',
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#52C41A',
  },
  actionsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#40A9FF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  disconnectButton: {
    backgroundColor: '#8C8C8C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 24,
  },
  disconnectText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
});

export default ConnectedDevice; 