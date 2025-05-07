import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Modal,
  Animated,
  Easing,
  Dimensions,
  DrawerLayoutAndroid
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import BleService from '../core/BleService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDeviceInfo } from '../contexts/DeviceInfoContext';
import { useBloodPressureHistory, useComprehensiveHistory, useHeartHistory, useSleepHistory, useSportHistory } from '../contexts';

interface HomeScreenProps {
  device: Device | null;
  onNavigateToHeartRate: () => void;
  onNavigateToSpO2: () => void;
  onNavigateToSleepStats: () => void;
  onNavigateToHealthStats: () => void;
  onDisconnect: () => void;
  bleService: BleService | null;
  onConnect?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  device,
  onNavigateToHeartRate,
  onNavigateToSpO2,
  onNavigateToSleepStats,
  onNavigateToHealthStats,
  onDisconnect,
  bleService,
  onConnect
}) => {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState(0);
  const [currentService, setCurrentService] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteProgress, setDeleteProgress] = React.useState(0);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const drawerRef = React.useRef<DrawerLayoutAndroid>(null);

  // Sử dụng DeviceInfoContext để lấy thông tin thiết bị

  const { sleepHistoryData } = useSleepHistory()
  const { bloodPressureHistoryData } = useBloodPressureHistory()
  const { heartHistoryData } = useHeartHistory()
  const { sportHistoryData } = useSportHistory()
  const { comprehensiveHistoryData } = useComprehensiveHistory()
  const { deviceInfo, updateDeviceInfo } = useDeviceInfo();

  // Animation cho hiệu ứng pulse
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Animation cho hiệu ứng rotate
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  useEffect(() => {
    console.log(">>>>>", deviceInfo)
  }, [deviceInfo])

  // Bắt đầu animation khi đang đồng bộ
  React.useEffect(() => {
    if (isSyncing) {
      // Hiệu ứng pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true
          })
        ])
      ).start();

      // Hiệu ứng quay
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    } else {
      // Dừng animation khi không đồng bộ nữa
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
      setSyncProgress(0);
      setCurrentService('');
    }
  }, [isSyncing]);

  // Lấy thông tin thiết bị khi kết nối
  React.useEffect(() => {
    if (device && bleService) {
      // Cập nhật thông tin thiết bị ngay khi kết nối
      updateDeviceInfo();

      // Cập nhật thông tin thiết bị định kỳ mỗi 30 giây
      const intervalId = setInterval(() => {
        updateDeviceInfo();
      }, 30000);

      return () => clearInterval(intervalId);
    }
  }, [device, bleService]);



  const deleteAllHealthData = async () => {
    if (!bleService) return;
    
    try {
      setIsDeleting(true);
      setDeleteProgress(0);
      
      const result = await bleService.deleteHealthData((progress) => {
        console.log(`Tiến trình xóa dữ liệu: ${progress}%`);
        setDeleteProgress(progress);
      });
      
      setIsDeleting(false);
      
      if (result) {
        alert('Đã xóa tất cả dữ liệu sức khỏe thành công');
      } else {
        alert('Có lỗi xảy ra khi xóa một số loại dữ liệu sức khỏe');
      }
    } catch (error) {
      console.error('Lỗi khi xóa dữ liệu sức khỏe:', error);
      alert('Đã xảy ra lỗi khi xóa dữ liệu sức khỏe');
      setIsDeleting(false);
    }
  };

  const syncHealthData = async () => {
    if (!bleService) return;

    try {
      setIsSyncing(true);
      setSyncProgress(0);
      setCurrentService('');

      await bleService.syncHealthData((progress, service) => {
        console.log(`Đồng bộ dữ liệu: ${progress}% - ${service}`);
        setSyncProgress(progress);
        setCurrentService(service);
      }, () => {
        console.log('ok >>>>>>>')
        setIsSyncing(false);
      });
    } catch (error) {
      console.log(error);
      setIsSyncing(false);
    }
  };

  // Chuyển đổi tên service thành tiếng Việt
  const getServiceName = (serviceName: string) => {
    switch (serviceName) {
      case 'sportHistory':
        return 'Dữ liệu thể thao';
      case 'sleepHistory':
        return 'Dữ liệu giấc ngủ';
      case 'heartHistory':
        return 'Dữ liệu nhịp tim';
      case 'bloodPressureHistory':
        return 'Dữ liệu huyết áp';
      case 'comprehensiveMeasurement':
        return 'Dữ liệu đo tổng hợp';
      default:
        return serviceName;
    }
  };

  // Nội dung drawer hiển thị thông tin thiết bị
  const renderDeviceInfoDrawer = () => (
    <View style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>Thông tin thiết bị</Text>
        <TouchableOpacity
          onPress={() => {
            if (drawerRef.current) {
              drawerRef.current.closeDrawer();
              setDrawerOpen(false);
            }
          }}
        >
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.deviceInfoList}>
        <View style={styles.deviceInfoItem}>
          <Text style={styles.deviceInfoLabel}>Phiên bản:</Text>
          <Text style={styles.deviceInfoValue}>{deviceInfo.deviceVersion}</Text>
        </View>

        <View style={styles.deviceInfoItem}>
          <Text style={styles.deviceInfoLabel}>ID thiết bị:</Text>
          <Text style={styles.deviceInfoValue}>{deviceInfo.deviceId}</Text>
        </View>

        <View style={styles.deviceInfoItem}>
          <Text style={styles.deviceInfoLabel}>Phiên bản chính:</Text>
          <Text style={styles.deviceInfoValue}>{deviceInfo.deviceMainVersion}</Text>
        </View>

        <View style={styles.deviceInfoItem}>
          <Text style={styles.deviceInfoLabel}>Phiên bản phụ:</Text>
          <Text style={styles.deviceInfoValue}>{deviceInfo.deviceSubVersion}</Text>
        </View>

        <View style={styles.deviceInfoItem}>
          <Text style={styles.deviceInfoLabel}>Trạng thái pin:</Text>
          <Text style={styles.deviceInfoValue}>
            {deviceInfo.deviceBatteryState === 0 ? 'Không sạc' : 'Đang sạc'}
          </Text>
        </View>

        <View style={styles.deviceInfoItem}>
          <Text style={styles.deviceInfoLabel}>Mức pin:</Text>
          <Text style={styles.deviceInfoValue}>{deviceInfo.deviceBatteryValue}%</Text>
        </View>

        <View style={styles.deviceInfoItem}>
          <Text style={styles.deviceInfoLabel}>Trạng thái liên kết:</Text>
          <Text style={styles.deviceInfoValue}>
            {deviceInfo.devicetBindState === 0 ? 'Chưa liên kết' : 'Đã liên kết'}
          </Text>
        </View>

        <View style={styles.deviceInfoItem}>
          <Text style={styles.deviceInfoLabel}>Trạng thái đồng bộ:</Text>
          <Text style={styles.deviceInfoValue}>
            {deviceInfo.devicetSyncState === 0 ? 'Chưa đồng bộ' : 'Đã đồng bộ'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <DrawerLayoutAndroid
      ref={drawerRef}
      drawerWidth={300}
      drawerPosition="right"
      renderNavigationView={renderDeviceInfoDrawer}
      onDrawerClose={() => setDrawerOpen(false)}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <View style={styles.headerGradient}>
              <View style={styles.headerContent}>
                <View style={styles.deviceInfoContainer}>
                  <View style={styles.ringIconContainer}>
                    <View style={styles.ringOuterCircle}>
                      <View style={styles.ringInnerCircle}>
                        <MaterialCommunityIcons name={"ring" as any} size={24} color="#FB6F92" />
                      </View>
                    </View>
                  </View>
                  <View style={styles.deviceTextContainer}>
                    <Text style={styles.welcomeText}>Xin chào,</Text>
                    <Text style={styles.deviceNameText}>{device ? (device.name || "Smart Ring") : "Smart Ring"}</Text>
                  </View>
                </View>

                <View style={styles.headerActionsContainer}>
                  {device && bleService ? (
                    <>
                      <TouchableOpacity
                        style={styles.headerActionButton}
                        onPress={syncHealthData}
                      >
                        <Animated.View style={{
                          transform: [{ rotate: rotateInterpolate }],
                          opacity: isSyncing ? 1 : 0.8
                        }}>
                          <MaterialCommunityIcons name={"sync" as any} size={22} color="#FFF" />
                        </Animated.View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.headerActionButton, {backgroundColor: '#FF8FAB'}]}
                        onPress={deleteAllHealthData}
                      >
                        <MaterialCommunityIcons name={"delete" as any} size={22} color="#FFF" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.headerActionButton, styles.disconnectButton]}
                        onPress={onDisconnect}
                      >
                        <MaterialCommunityIcons name={"bluetooth-off" as any} size={22} color="#FFF" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.headerActionButton}
                      onPress={onConnect}
                    >
                      <MaterialCommunityIcons name={"bluetooth-connect" as any} size={22} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.connectionStatusBar}>
                <View style={styles.connectionStatusIndicator}>
                  {device ? (
                    <>
                      <View style={styles.pulsingDot}>
                        <Animated.View
                          style={[
                            styles.pulsingDotInner,
                            { transform: [{ scale: pulseAnim }] }
                          ]}
                        />
                      </View>
                      <Text style={styles.connectionStatusText}>Đã kết nối và hoạt động tốt</Text>
                    </>
                  ) : (
                    <>
                      <View style={[styles.pulsingDot, styles.disconnectedDot]}>
                        <View style={[styles.pulsingDotInner, styles.disconnectedDotInner]} />
                      </View>
                      <Text style={styles.disconnectedStatusText}>Chưa kết nối thiết bị</Text>
                    </>
                  )}
                </View>
                {device && (
                  <TouchableOpacity
                    style={styles.batteryContainer}
                    onPress={() => {
                      if (drawerRef.current) {
                        // Lấy thông tin mới nhất trước khi mở drawer
                        updateDeviceInfo();
                        drawerRef.current.openDrawer();
                        setDrawerOpen(true);
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name={deviceInfo.deviceBatteryValue > 80 ? "battery" :
                        deviceInfo.deviceBatteryValue > 30 ? "battery-50" :
                          "battery-20"}
                      size={16}
                      color={deviceInfo.deviceBatteryValue > 20 ? "#52C41A" : "#F5222D"}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.batteryStatusText, {
                      color: deviceInfo.deviceBatteryValue > 20 ? "#52C41A" : "#F5222D"
                    }]}>Pin: {deviceInfo.deviceBatteryValue}%</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          {!device ? (
            <View style={styles.connectDeviceCard}>
              <MaterialCommunityIcons name="bluetooth-off" size={60} color="#91D5FF" style={styles.connectIcon} />

              <Text style={styles.connectTitle}>Chưa có thiết bị nào được kết nối</Text>
              <Text style={styles.connectDescription}>
                Kết nối với SmartRing của bạn để theo dõi sức khỏe và giấc ngủ
              </Text>

              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => {
                  console.log('Nút kết nối trong HomeScreen được bấm');
                  console.log('onConnect có tồn tại:', !!onConnect);
                  // Gọi hàm onConnect trực tiếp nếu nó tồn tại
                  if (onConnect) {
                    onConnect();
                  }
                }}
              >
                <MaterialCommunityIcons name="bluetooth-connect" size={24} color="white" />
                <Text style={styles.connectButtonText}>Kết nối thiết bị</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.sleepSummaryCard}
                onPress={onNavigateToSleepStats}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <MaterialCommunityIcons name={"sleep" as any} size={22} color="#6979F8" />
                    <Text style={styles.cardTitle}>Giấc ngủ đêm qua</Text>
                  </View>
                  <TouchableOpacity onPress={onNavigateToSleepStats}>
                    <Text style={styles.detailsLink}>Chi tiết</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.sleepTimeContainer}>
                  <Text style={styles.sleepTime}>
                    {sleepHistoryData && sleepHistoryData.overview
                      ? (() => {
                        const totalMinutes = sleepHistoryData.overview.totalSleepTime;
                        const hours = Math.floor(totalMinutes / 60);
                        const minutes = Math.round(totalMinutes % 60);
                        return `${hours} giờ ${minutes} phút`;
                      })()
                      : '--- giờ --- phút'}
                  </Text>
                  <View style={styles.sleepQuality}>
                    <View style={styles.qualityDot} />
                    <Text style={styles.qualityText}>
                      {sleepHistoryData && sleepHistoryData.overview
                        ? (() => {
                          const totalMinutes = sleepHistoryData.overview.totalSleepTime;
                          if (totalMinutes >= 420) return 'Tốt';
                          else if (totalMinutes >= 360) return 'Bình thường';
                          else return 'Kém';
                        })()
                        : 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.sleepStagesBar}>
                  {sleepHistoryData && sleepHistoryData.overview
                    ? (() => {
                      const lightSleepFlex = sleepHistoryData.overview.totalLightSleep || 0;
                      const deepSleepFlex = sleepHistoryData.overview.totalDeepSleep || 0;
                      const remSleepFlex = sleepHistoryData.overview.totalREM || 0;
                      const awakeFlex = sleepHistoryData.overview.wakeupCount || 0;

                      // Đảm bảo có ít nhất một giá trị để hiển thị
                      const totalFlex = lightSleepFlex + deepSleepFlex + remSleepFlex + awakeFlex;

                      return (
                        <>
                          {totalFlex > 0 ? (
                            <>
                              <View style={[styles.sleepStage, {
                                flex: lightSleepFlex > 0 ? lightSleepFlex : 0.1,
                                backgroundColor: '#36CFC9'
                              }]} />
                              <View style={[styles.sleepStage, {
                                flex: deepSleepFlex > 0 ? deepSleepFlex : 0.1,
                                backgroundColor: '#6979F8'
                              }]} />
                              <View style={[styles.sleepStage, {
                                flex: remSleepFlex > 0 ? remSleepFlex : 0.1,
                                backgroundColor: '#FFB980'
                              }]} />
                              <View style={[styles.sleepStage, {
                                flex: awakeFlex > 0 ? awakeFlex : 0.1,
                                backgroundColor: '#D9D9D9'
                              }]} />
                            </>
                          ) : (
                            <>
                              <View style={[styles.sleepStage, { flex: 1, backgroundColor: '#E5E5E5' }]} />
                            </>
                          )}
                        </>
                      );
                    })()
                    : <View style={[styles.sleepStage, { flex: 1, backgroundColor: '#E5E5E5' }]} />
                  }
                </View>

                <View style={styles.sleepLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#36CFC9' }]} />
                    <Text style={styles.legendText}>Ngủ nhẹ</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#6979F8' }]} />
                    <Text style={styles.legendText}>Ngủ sâu</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFB980' }]} />
                    <Text style={styles.legendText}>REM</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#D9D9D9' }]} />
                    <Text style={styles.legendText}>Thức</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.healthSummaryHeader}
                onPress={onNavigateToHealthStats}
              >
                <View style={styles.healthSummaryTitleContainer}>
                  <MaterialCommunityIcons name="heart-pulse" size={22} color="#FB6F92" style={styles.healthSummaryIcon} />
                  <Text style={styles.healthSummaryTitle}>Tổng quan sức khỏe</Text>
                </View>
                <View style={styles.healthSummaryViewAll}>
                  <Text style={styles.healthSummaryViewAllText}>Xem tất cả</Text>
                  <View style={styles.healthSummaryArrowContainer}>
                    <MaterialCommunityIcons name="chevron-right" size={16} color="#FFF" />
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.healthMetricsContainer}>
                <TouchableOpacity
                  style={styles.healthMetricCard}
                  onPress={onNavigateToHeartRate}
                >
                  <View style={[styles.healthMetricIconContainer, { backgroundColor: '#FFF0F6' }]}>
                    <MaterialCommunityIcons name={"heart-pulse" as any} size={22} color="#FB6F92" />
                  </View>
                  <View style={styles.healthMetricContent}>
                    <Text style={styles.healthMetricTitle}>Nhịp tim</Text>
                    <Text style={styles.healthMetricValue}>
                      {heartHistoryData && heartHistoryData.data && heartHistoryData.data.length > 0
                        ? heartHistoryData.data[heartHistoryData.data.length - 1].heartValue
                        : '---'} <Text style={styles.healthMetricUnit}>BPM</Text>
                    </Text>
                    <View style={styles.healthMetricStatusContainer}>
                      {heartHistoryData && heartHistoryData.data && heartHistoryData.data.length > 0 &&
                        (() => {
                          const heartRate = heartHistoryData.data[heartHistoryData.data.length - 1].heartValue;
                          let statusColor = '#52C41A'; // Mặc định là màu xanh cho trạng thái bình thường
                          let statusText = 'Bình thường';

                          if (heartRate < 60) {
                            statusColor = '#FAAD14'; // Màu vàng cho trạng thái thấp
                            statusText = 'Thấp';
                          } else if (heartRate > 100) {
                            statusColor = '#FF4D4F'; // Màu đỏ cho trạng thái cao
                            statusText = 'Cao';
                          }

                          return (
                            <>
                              <View style={[styles.healthMetricStatusDot, { backgroundColor: statusColor }]} />
                              <Text style={[styles.healthMetricStatusText, { color: statusColor }]}>{statusText}</Text>
                            </>
                          );
                        })()
                      }
                      {(!heartHistoryData || !heartHistoryData.data || heartHistoryData.data.length === 0) && (
                        <Text style={styles.healthMetricStatusText}>N/A</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.healthMetricCard}
                  onPress={onNavigateToSpO2}
                >
                  <View style={[styles.healthMetricIconContainer, { backgroundColor: '#F6FFED' }]}>
                    <MaterialCommunityIcons name={"water-percent" as any} size={22} color="#95DE64" />
                  </View>
                  <View style={styles.healthMetricContent}>
                    <Text style={styles.healthMetricTitle}>SpO2</Text>
                    <Text style={styles.healthMetricValue}>
                      {comprehensiveHistoryData && comprehensiveHistoryData.data && comprehensiveHistoryData.data.length > 0
                        ? comprehensiveHistoryData.data[comprehensiveHistoryData.data.length - 1].OOValue
                        : '---'} <Text style={styles.healthMetricUnit}>%</Text>
                    </Text>
                    <View style={styles.healthMetricStatusContainer}>
                      {comprehensiveHistoryData && comprehensiveHistoryData.data && comprehensiveHistoryData.data.length > 0 &&
                        (() => {
                          const spo2 = comprehensiveHistoryData.data[comprehensiveHistoryData.data.length - 1].OOValue;
                          let statusColor = '#52C41A'; // Mặc định là màu xanh cho trạng thái tốt
                          let statusText = 'Tốt';

                          if (spo2 < 90) {
                            statusColor = '#FF4D4F'; // Màu đỏ cho trạng thái thấp
                            statusText = 'Thấp';
                          } else if (spo2 < 95) {
                            statusColor = '#FAAD14'; // Màu vàng cho trạng thái bình thường
                            statusText = 'Bình thường';
                          }

                          return (
                            <>
                              <View style={[styles.healthMetricStatusDot, { backgroundColor: statusColor }]} />
                              <Text style={[styles.healthMetricStatusText, { color: statusColor }]}>{statusText}</Text>
                            </>
                          );
                        })()
                      }
                      {(!comprehensiveHistoryData || !comprehensiveHistoryData.data || comprehensiveHistoryData.data.length === 0) && (
                        <Text style={styles.healthMetricStatusText}>N/A</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.healthMetricCard}
                  onPress={onNavigateToHealthStats}
                >
                  <View style={[styles.healthMetricIconContainer, { backgroundColor: '#E6F7FF' }]}>
                    <MaterialCommunityIcons name={"shoe-print" as any} size={22} color="#40A9FF" />
                  </View>
                  <View style={styles.healthMetricContent}>
                    <Text style={styles.healthMetricTitle}>Bước chân</Text>
                    <Text style={styles.healthMetricValue}>
                      {sportHistoryData && sportHistoryData.data && sportHistoryData.data.length > 0
                        ? sportHistoryData.data[sportHistoryData.data.length - 1].sportStep.toLocaleString('vi-VN')
                        : '---'}
                    </Text>
                    <View style={styles.healthMetricProgressContainer}>
                      {sportHistoryData && sportHistoryData.data && sportHistoryData.data.length > 0 && (
                        <>
                          <View style={styles.healthMetricProgressBar}>
                            <View
                              style={[
                                styles.healthMetricProgressFill,
                                {
                                  width: `${Math.min(100, Math.round((sportHistoryData.data[sportHistoryData.data.length - 1].sportStep / 10000) * 100))}%`,
                                  backgroundColor: '#40A9FF'
                                }
                              ]}
                            />
                          </View>
                          <Text style={styles.healthMetricProgressText}>
                            {Math.min(100, Math.round((sportHistoryData.data[sportHistoryData.data.length - 1].sportStep / 10000) * 100))}%
                          </Text>
                        </>
                      )}
                      {(!sportHistoryData || !sportHistoryData.data || sportHistoryData.data.length === 0) && (
                        <Text style={styles.healthMetricStatusText}>N/A</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.healthMetricCard}
                  onPress={onNavigateToHealthStats}
                >
                  <View style={[styles.healthMetricIconContainer, { backgroundColor: '#FFF7CD' }]}>
                    <MaterialCommunityIcons name={"heart-flash" as any} size={22} color="#FFC53D" />
                  </View>
                  <View style={styles.healthMetricContent}>
                    <Text style={styles.healthMetricTitle}>Huyết Áp</Text>
                    <Text style={styles.healthMetricValue}>
                      {bloodPressureHistoryData && bloodPressureHistoryData.historyData && bloodPressureHistoryData.historyData.length > 0
                        ? `${bloodPressureHistoryData.historyData[bloodPressureHistoryData.historyData.length - 1].bloodSBP}/${bloodPressureHistoryData.historyData[bloodPressureHistoryData.historyData.length - 1].bloodDBP}`
                        : '---'} <Text style={styles.healthMetricUnit}>mmHg</Text>
                    </Text>
                    <View style={styles.healthMetricStatusContainer}>
                      {bloodPressureHistoryData && bloodPressureHistoryData.historyData && bloodPressureHistoryData.historyData.length > 0 &&
                        (() => {
                          const systolic = bloodPressureHistoryData.historyData[bloodPressureHistoryData.historyData.length - 1].bloodSBP;
                          const diastolic = bloodPressureHistoryData.historyData[bloodPressureHistoryData.historyData.length - 1].bloodDBP;
                          let statusColor = '#52C41A'; // Mặc định là màu xanh cho trạng thái bình thường
                          let statusText = 'Bình thường';

                          if (systolic > 140 || diastolic > 90) {
                            statusColor = '#FF4D4F'; // Màu đỏ cho trạng thái cao
                            statusText = 'Cao';
                          } else if (systolic < 90 || diastolic < 60) {
                            statusColor = '#FAAD14'; // Màu vàng cho trạng thái thấp
                            statusText = 'Thấp';
                          }

                          return (
                            <>
                              <View style={[styles.healthMetricStatusDot, { backgroundColor: statusColor }]} />
                              <Text style={[styles.healthMetricStatusText, { color: statusColor }]}>{statusText}</Text>
                            </>
                          );
                        })()
                      }
                      {(!bloodPressureHistoryData || !bloodPressureHistoryData.historyData || bloodPressureHistoryData.historyData.length === 0) && (
                        <Text style={styles.healthMetricStatusText}>N/A</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.healthMetricCard}
                  onPress={onNavigateToHealthStats}
                >
                  <View style={[styles.healthMetricIconContainer, { backgroundColor: '#FFE8F7' }]}>
                    <MaterialCommunityIcons name={"heart-pulse" as any} size={22} color="#F759AB" />
                  </View>
                  <View style={styles.healthMetricContent}>
                    <Text style={styles.healthMetricTitle}>Biến thiên nhịp tim</Text>
                    <Text style={styles.healthMetricValue}>
                      {comprehensiveHistoryData && comprehensiveHistoryData.overview
                        ? comprehensiveHistoryData.overview.hrvValueAvg
                        : '---'} <Text style={styles.healthMetricUnit}>ms</Text>
                    </Text>
                    <View style={styles.healthMetricStatusContainer}>
                      {comprehensiveHistoryData && comprehensiveHistoryData.overview &&
                        (() => {
                          const hrvValue = comprehensiveHistoryData.overview.hrvValueAvg;
                          let statusColor = '#52C41A'; // Mặc định là màu xanh cho trạng thái tốt
                          let statusText = 'Tốt';

                          if (hrvValue < 30) {
                            statusColor = '#FF4D4F'; // Màu đỏ cho trạng thái thấp
                            statusText = 'Thấp';
                          } else if (hrvValue < 50) {
                            statusColor = '#FAAD14'; // Màu vàng cho trạng thái trung bình
                            statusText = 'Trung bình';
                          }

                          return (
                            <>
                              <View style={[styles.healthMetricStatusDot, { backgroundColor: statusColor }]} />
                              <Text style={[styles.healthMetricStatusText, { color: statusColor }]}>{statusText}</Text>
                            </>
                          );
                        })()
                      }
                      {(!comprehensiveHistoryData || !comprehensiveHistoryData.overview) && (
                        <Text style={styles.healthMetricStatusText}>N/A</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.healthMetricCard}
                  onPress={onNavigateToHealthStats}
                >
                  <View style={[styles.healthMetricIconContainer, { backgroundColor: '#D9F7BE' }]}>
                    <MaterialCommunityIcons name={"lungs" as any} size={22} color="#73D13D" />
                  </View>
                  <View style={styles.healthMetricContent}>
                    <Text style={styles.healthMetricTitle}>Tần số hô hấp</Text>
                    <Text style={styles.healthMetricValue}>
                      {comprehensiveHistoryData && comprehensiveHistoryData.overview
                        ? comprehensiveHistoryData.overview.respiratoryRateValueAvg
                        : '---'} <Text style={styles.healthMetricUnit}>BPM</Text>
                    </Text>
                    <View style={styles.healthMetricStatusContainer}>
                      {comprehensiveHistoryData && comprehensiveHistoryData.overview &&
                        (() => {
                          const respiratoryRate = comprehensiveHistoryData.overview.respiratoryRateValueAvg;
                          let statusColor = '#52C41A'; // Mặc định là màu xanh cho trạng thái bình thường
                          let statusText = 'Bình thường';

                          if (respiratoryRate < 12) {
                            statusColor = '#FAAD14'; // Màu vàng cho trạng thái thấp
                            statusText = 'Thấp';
                          } else if (respiratoryRate > 20) {
                            statusColor = '#FF4D4F'; // Màu đỏ cho trạng thái cao
                            statusText = 'Cao';
                          }

                          return (
                            <>
                              <View style={[styles.healthMetricStatusDot, { backgroundColor: statusColor }]} />
                              <Text style={[styles.healthMetricStatusText, { color: statusColor }]}>{statusText}</Text>
                            </>
                          );
                        })()
                      }
                      {(!comprehensiveHistoryData || !comprehensiveHistoryData.overview) && (
                        <Text style={styles.healthMetricStatusText}>N/A</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
        <Modal
          visible={isSyncing}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.syncDialogContainer}>
              <View style={styles.syncDialogHeader}>
                <Animated.View
                  style={{
                    transform: [{ rotate: rotateInterpolate }]
                  }}
                >
                  <MaterialCommunityIcons
                    name="sync"
                    size={28}
                    color="#40A9FF"
                  />
                </Animated.View>
                <Text style={styles.syncDialogTitle}>Đang đồng bộ dữ liệu</Text>
              </View>

              <View style={styles.syncServiceContainer}>
                <Animated.View
                  style={[styles.syncIconContainer, {
                    transform: [{ scale: pulseAnim }]
                  }]}
                >
                  <MaterialCommunityIcons
                    name={currentService === 'heartHistory' ? "heart-pulse" :
                      currentService === 'sleepHistory' ? "sleep" :
                        currentService === 'sportHistory' ? "run-fast" :
                          currentService === 'bloodPressureHistory' ? "heart-flash" :
                            currentService === 'comprehensiveMeasurement' ? "clipboard-pulse-outline" :
                              "cloud-sync"}
                    size={28}
                    color={currentService === 'heartHistory' ? "#FB6F92" :
                      currentService === 'sleepHistory' ? "#69C0FF" :
                        currentService === 'sportHistory' ? "#95DE64" :
                          currentService === 'bloodPressureHistory' ? "#FF8FAB" :
                            currentService === 'comprehensiveMeasurement' ? "#FFCF33" :
                              "#40A9FF"}
                  />
                </Animated.View>
                <Text style={styles.syncServiceName}>
                  {currentService ? getServiceName(currentService) : 'Chuẩn bị đồng bộ...'}
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[styles.progressBarFill, { width: `${syncProgress}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>{syncProgress}%</Text>
              </View>

              <Text style={styles.syncMessage}>
                Vui lòng không tắt ứng dụng hoặc ngắt kết nối thiết bị trong quá trình đồng bộ
              </Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </DrawerLayoutAndroid>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerGradient: {
    backgroundColor: '#FB6F92',
    paddingTop: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  deviceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringIconContainer: {
    marginRight: 14,
  },
  ringOuterCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInnerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceTextContainer: {
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  deviceNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disconnectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  connectionStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  connectionStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(82, 196, 26, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pulsingDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#52C41A',
  },
  disconnectedDot: {
    backgroundColor: 'rgba(245, 34, 45, 0.15)',
  },
  disconnectedDotInner: {
    backgroundColor: '#F5222D',
    transform: [{ scale: 1 }],
  },
  connectionStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#52C41A',
  },
  disconnectedStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F5222D',
  },
  batteryStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectDeviceCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  connectIcon: {
    marginBottom: 16,
  },
  connectTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  connectDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  connectButton: {
    flexDirection: 'row',
    backgroundColor: '#40A9FF',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#40A9FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    alignItems: 'center',
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  healthSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  healthSummaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthSummaryIcon: {
    marginRight: 8,
  },
  healthSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  healthSummaryViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthSummaryViewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#40A9FF',
    marginRight: 6,
  },
  healthSummaryArrowContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#40A9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#40A9FF',
    marginRight: 2,
  },
  healthMetricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  healthMetricCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  healthMetricIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  healthMetricContent: {
    flex: 1,
  },
  healthMetricTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  healthMetricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  healthMetricUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#666',
  },
  healthMetricStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthMetricStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  healthMetricStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  healthMetricProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthMetricProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  healthMetricProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  healthMetricProgressText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#40A9FF',
    width: 30,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickStatCard: {
    width: '31%',
    padding: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  quickStatUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#666',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  sleepSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  detailsLink: {
    fontSize: 14,
    color: '#40A9FF',
  },
  sleepTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sleepTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sleepQuality: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#52C41A',
    marginRight: 6,
  },
  qualityText: {
    fontSize: 14,
    color: '#52C41A',
  },
  sleepStagesBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  sleepStage: {
    height: '100%',
  },
  sleepLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  // Styles cho modal đồng bộ dữ liệu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncDialogContainer: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  syncDialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  syncDialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  syncServiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  syncIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  syncServiceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#40A9FF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#40A9FF',
    width: 40,
    textAlign: 'right',
  },
  syncMessage: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Styles cho drawer thông tin thiết bị
  drawerContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceInfoList: {
    flex: 1,
  },
  deviceInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  deviceInfoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  deviceInfoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});

export default HomeScreen;