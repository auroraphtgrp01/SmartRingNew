import React from 'react';
import { 
  View, 
  Modal, 
  StyleSheet, 
  Animated, 
  TouchableWithoutFeedback,
  Dimensions
} from 'react-native';

const { height } = Dimensions.get('window');

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const CustomModal: React.FC<CustomModalProps> = ({ visible, onClose, children }) => {
  const [modalAnimation] = React.useState(new Animated.Value(height));
  const [backdropAnimation] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      // Hiển thị modal
      Animated.parallel([
        Animated.timing(backdropAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalAnimation, {
          toValue: 0,
          tension: 70,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Ẩn modal
      Animated.parallel([
        Animated.timing(backdropAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(modalAnimation, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View 
            style={[
              styles.backdrop, 
              { opacity: backdropAnimation }
            ]} 
          />
        </TouchableWithoutFeedback>
        
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: modalAnimation }] }
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: height * 0.6,
    maxHeight: height * 0.9,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default CustomModal; 