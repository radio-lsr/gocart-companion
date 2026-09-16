import 'react-native-gesture-handler';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {BarcodeView} from './src/pages/BarcodeView';
import {SignInPage} from './src/pages/SignInPage';
import { SignUpPage } from './src/pages/SignUpPage';
import Admin from './src/pages/Admin';
import {Cart} from './src/pages/Cart';
import {Profile} from './src/pages/Profile';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { isLoggedIn } from './src/pages/SignInPage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Confirmation } from './src/pages/Confirmation';
import {Rejection} from "./src/pages/Rejection";
import {ChangePasswordScreen} from './src/screens/ChangePasswordScreen';
import {PersonalInfoScreen} from './src/screens/PersonalInfoScreen';
import {CashierManagementScreen} from './src/screens/CashierManagementScreen';
import {StatisticsScreen} from './src/screens/StatisticsScreen';
import {OrderHistoryScreen} from './src/screens/OrderHistoryScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';



const AuthStack = createStackNavigator();
const Tabs = createBottomTabNavigator();

export default function App() {
  return (
  <NavigationContainer>
    <AuthStack.Navigator>
      {isLoggedIn ? (
          <>
            <AuthStack.Screen name="SKRT" component={TabManager} options={{headerShown: false}}/>
            <AuthStack.Screen name="Confirmation" component={Confirmation}/>
            <AuthStack.Screen name="Rejection" component={Rejection}/>
            <AuthStack.Screen name="Admin" component={Admin}/>
            <AuthStack.Screen name="ChangerMotDePasse" component={ChangePasswordScreen}/>
            <AuthStack.Screen name="Infos" component={PersonalInfoScreen}/>
            <AuthStack.Screen name="Caissiers" component={CashierManagementScreen} options={{headerShown: true}}/>
            <AuthStack.Screen name="Statistiques" component={StatisticsScreen}/>
            <AuthStack.Screen name="Commandes" component={OrderHistoryScreen}/>
            <AuthStack.Screen name="OrderDetail" component={OrderDetailScreen} />
          </>
        ) : (
          <>
            <AuthStack.Screen name="SignIn" component={SignInPage} options={{headerShown: false}}/>
            <AuthStack.Screen name="SignUp" component={SignUpPage} options={{headerShown: false}}/>
            <AuthStack.Screen name="SKRT" component={TabManager} options={{headerShown: false}}/>
            <AuthStack.Screen name="Confirmation" component={Confirmation}/>
            <AuthStack.Screen name="Rejection" component={Rejection}/>
            <AuthStack.Screen name="Admin" component={Admin}/>
            <AuthStack.Screen name="ChangerMotDePasse" component={ChangePasswordScreen}/>
            <AuthStack.Screen name="Infos" component={PersonalInfoScreen}/>
            <AuthStack.Screen name="Caissiers" component={CashierManagementScreen} options={{headerShown: true}}/>
            <AuthStack.Screen name="Statistiques" component={StatisticsScreen}/>
            <AuthStack.Screen name="Commandes" component={OrderHistoryScreen}/>
            <AuthStack.Screen name="OrderDetail" component={OrderDetailScreen} />
          </>
        )}
      </AuthStack.Navigator>
    </NavigationContainer>
  );
}

export const TabManager = ({ navigation }) => {
  return (
    <Tabs.Navigator>
      <Tabs.Screen
        name="Scan"
        component={BarcodeView}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="camera" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Cart"
        component={Cart}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tabs.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});