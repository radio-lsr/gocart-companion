import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  Button,
  TouchableOpacity,
} from "react-native";
import './Cart.js'
import LottieView from 'lottie-react-native';


import QRCode from 'react-native-qrcode-svg';

// Simple usage, defaults for all but the value
export const Confirmation = ({ navigation }) => {
    return (
      <View style={styles.container}>
      <LottieView
      style = {styles.check}
      source = {require("../../assets/64248-checkmark.json")}
      autoPlay = {true}
      loop = {false}
      />
      <Text style={styles.success}>Your order has been approved!</Text>
      <Text style={styles.confnumber}>Order Number - {global.id_code}</Text>
      </View>
    ); 
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  success: {
    fontSize : 20,
    fontWeight: "bold",
    paddingBottom: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  msg: {
    fontSize : 15,
    fontWeight: "bold",
    paddingBottom: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  confnumber: {
    paddingTop: 10,
    paddingBottom: 80,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  check: {
    width:300,
    height:300,
  },
});
