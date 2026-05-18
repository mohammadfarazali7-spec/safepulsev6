// app/OneTapCall.tsx
import { Linking, Platform, Alert } from 'react-native';

/**
 * Ye function dialer kholega aur number pehle se likh dega
 */
export const initiateEmergencyCall = async (phoneNumber: string) => {
  // tel: protocol dialer kholne ke liye use hota hai
  const url = `tel:${phoneNumber}`;

  try {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      // Dialer kholne ka asli command
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Aapka device is feature ko support nahi karta.");
    }
  } catch (error) {
    console.error("Dialer error:", error);
    Alert.alert("Error", "Dialer kholne mein masla hua.");
  }
};