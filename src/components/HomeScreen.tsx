import React, { useEffect } from 'react';
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
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Device } from 'react-native-ble-plx';
import BleService from '../core/BleService';
import { useBloodPressureHistory, useComprehensiveHistory, useHeartHistory, useSleepHistory, useSportHistory } from '../contexts';

interface HomeScreenProps {
  device: Device;
  onNavigateToHeartRate: () => void;
  onNavigateToSpO2: () => void;
  onNavigateToSleepStats: () => void;
  onNavigateToHealthStats: () => void;
  onDisconnect: () => void;
  bleService: BleService;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  device, 
  onNavigateToHeartRate, 
  onNavigateToSpO2, 
  onNavigateToSleepStats, 
  onNavigateToHealthStats, 
  onDisconnect,
  bleService
}) => {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState(0);
  const [currentService, setCurrentService] = React.useState('');
  
  const {sleepHistoryData} = useSleepHistory()
  const {bloodPressureHistoryData} = useBloodPressureHistory()
  const {heartHistoryData} = useHeartHistory()
  const {sportHistoryData} = useSportHistory()
  const {comprehensiveHistoryData} = useComprehensiveHistory()

  // Animation cho hiệu ứng pulse
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  
  // Animation cho hiệu ứng rotate
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
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

  const syncHealthData = async () => {
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
    switch(serviceName) {
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.deviceInfo}>
            <View style={styles.deviceIconContainer}>
              <MaterialCommunityIcons name={"watch" as any} size={28} color="#40A9FF" />
            </View>
            <View>
              <Text style={styles.deviceName}>{device.name || "Smart Ring"}</Text>
              <View style={styles.deviceStatus}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Đã kết nối</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.syncButton} onPress={syncHealthData}>
              <MaterialCommunityIcons name={"sync" as any} size={20} color="#40A9FF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.disconnectButton} onPress={onDisconnect}>
              <MaterialCommunityIcons name={"bluetooth-off" as any} size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.sleepSummaryCard}>
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
        </View>
        <View style={styles.healthSummaryHeader}>
          <View style={styles.healthSummaryTitleContainer}>
            <MaterialCommunityIcons name="heart-pulse" size={22} color="#FB6F92" style={styles.healthSummaryIcon} />
            <Text style={styles.healthSummaryTitle}>Tổng quan sức khỏe</Text>
          </View>
          <TouchableOpacity 
            style={styles.healthSummaryViewAll} 
            onPress={onNavigateToHealthStats}
          >
            <Text style={styles.healthSummaryViewAllText}>Xem tất cả</Text>
            <View style={styles.healthSummaryArrowContainer}>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

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
          
          <TouchableOpacity style={styles.healthMetricCard}>
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
          
          <TouchableOpacity style={styles.healthMetricCard}>
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

          <TouchableOpacity style={styles.healthMetricCard}>
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
          
          <TouchableOpacity style={styles.healthMetricCard}>
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
                {currentService === 'heartHistory' && (
                  <MaterialCommunityIcons name="heart-pulse" size={24} color="#FB6F92" />
                )}
                {currentService === 'sleepHistory' && (
                  <MaterialCommunityIcons name="sleep" size={24} color="#69C0FF" />
                )}
                {currentService === 'sportHistory' && (
                  <MaterialCommunityIcons name="run" size={24} color="#95DE64" />
                )}
                {currentService === 'bloodPressureHistory' && (
                  <MaterialCommunityIcons name="heart-pulse" size={24} color="#FF8FAB" />
                )}
                {currentService === 'comprehensiveMeasurement' && (
                  <MaterialCommunityIcons name="clipboard-pulse" size={24} color="#FFCF33" />
                )}
                {!currentService && (
                  <MaterialCommunityIcons name="sync" size={24} color="#40A9FF" />
                )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E6F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  disconnectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default HomeScreen; 