import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableHighlight,
  Alert,
  ActivityIndicator,
  ScrollView
} from "react-native";
import { SwipeListView } from 'react-native-swipe-list-view';
import InputSpinner from "react-native-input-spinner";
import { useFocusEffect } from '@react-navigation/native';
import { app, database } from '../../config/firebase';
import CryptoES from "crypto-es";

const ScreenContainer = ({ children }) => (
  <View style={styles.container}>{children}</View>
);

export const Cart = ({ route, navigation }) => {
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userStoreId, setUserStoreId] = useState(null);
  const [noOrder, setNoOrder] = useState(false);

  const orderId = route.params?.scannedOrderId || global.id_code;

  const resetCartPage = () => {
    console.log('🔄 Réinitialisation de la page Cart');
    setOrderData(null);
    setLoading(false);
    setProcessing(false);
    setNoOrder(false);
    global.id_code = null;
  };

  const fetchCurrentUserData = async () => {
    try {
      const user = app.auth().currentUser;
      if (user) {
        setCurrentUser(user);
        const userSnapshot = await database.ref('users/' + user.uid).once('value');
        const userDataFromDB = userSnapshot.val();
        setUserData({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || userDataFromDB?.username || 'Utilisateur',
          username: userDataFromDB?.username || 'Caissier',
          role: userDataFromDB?.role || 'cashier',
          storeId: userDataFromDB?.storeId
        });
        setUserStoreId(userDataFromDB?.storeId);
      }
    } catch (error) {
      console.error('Error fetching current user data:', error);
    }
  };

  const getCurrentUserName = () => {
    if (userData && userData.username) return userData.username;
    if (currentUser && currentUser.displayName) return currentUser.displayName;
    return currentUser ? currentUser.email : 'Caissier';
  };

  useFocusEffect(
    React.useCallback(() => {
      if (!orderId) {
        setNoOrder(true);
        setLoading(false);
        return;
      }
      setNoOrder(false);
      fetchCurrentUserData();
      fetchOrderData(orderId);
      return () => {
        if (orderId) {
          const orderRef = database.ref('orders/' + orderId);
          orderRef.off();
        }
      };
    }, [orderId])
  );

  const fetchOrderData = (orderId) => {
    setLoading(true);
    const orderRef = database.ref('orders/' + orderId);

    orderRef.on("value", (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log('🔍 DONNÉES COMMANDE RÉCUPÉRÉES:', {
          orderId: data.orderId,
          storeId: data.storeId,
          status: data.status,
          total: data.total
        });
        // Vérification que la commande appartient au magasin de l'utilisateur
        if (userStoreId && data.storeId !== userStoreId) {
          Alert.alert(
            "Accès refusé",
            "Cette commande ne fait pas partie de votre magasin.",
            [{ text: "OK", onPress: resetCartPage }]
          );
          setLoading(false);
          return;
        }
        setOrderData(data);
      } else {
        Alert.alert("Erreur", "Commande non trouvée");
        resetCartPage();
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching order:', error);
      Alert.alert("Erreur", "Impossible de charger la commande");
      setLoading(false);
    });
  };

  const processRefund = async (orderData) => {
    try {
      console.log('🔄 Début du remboursement - Données commande:', {
        orderId: orderId,
        total: orderData.total,
        rapydPaymentId: orderData.rapydPaymentId,
        paymentId: orderData.paymentId,
        paymentType: orderData.paymentType,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus
      });

      let paymentId = orderData.rapydPaymentId || orderData.paymentId;
      
      if (!paymentId) {
        console.warn('Aucun ID de paiement trouvé dans les champs standards, recherche étendue...');
        const possiblePaymentFields = [
          'rapydPaymentId', 'paymentId', 'transferId', 
          'rapyd_transfer_id', 'payment_id', 'transactionId'
        ];
        for (const field of possiblePaymentFields) {
          if (orderData[field]) {
            paymentId = orderData[field];
            console.log(`✅ ID de paiement trouvé dans le champ: ${field} = ${paymentId}`);
            break;
          }
        }
      }

      if (!paymentId) {
        throw new Error(`Aucun ID de paiement valide trouvé dans la commande. Champs disponibles: ${JSON.stringify(Object.keys(orderData))}`);
      }

      console.log('✅ ID de paiement à utiliser pour le remboursement:', paymentId);

      const http_method = 'post';
      const url_path = '/v1/refunds';
      const salt = CryptoES.lib.WordArray.random(12);
      const timestamp = (Math.floor(new Date().getTime() / 1000) - 10).toString();
      const access_key = '8E34CFD95D661EF7946E';
      const secret_key = '5001ae0c57b14924dc361c69d2873c93246f9a22e26168ec514dfcaaa35e853bcd9c72c28dbca3c7';

      const body = JSON.stringify({
        "payment": paymentId,
        "amount": orderData.total,
        "currency": "USD",
        "metadata": {
          "merchant_defined": true,
          "reason": "commande_rejetee",
          "orderId": orderId
        }
      });

      console.log('📦 Corps de la requête de remboursement:', body);

      const to_sign = http_method + url_path + salt + timestamp + access_key + secret_key + body;
      const signature = CryptoES.enc.Base64.stringify(CryptoES.enc.Utf8.parse(
        CryptoES.enc.Hex.stringify(CryptoES.HmacSHA256(to_sign, secret_key))
      ));

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_key': access_key,
          'salt': salt,
          'timestamp': timestamp,
          'signature': signature,
        },
        body: body
      };

      console.log('🌐 Envoi de la requête de remboursement à Rapyd...');
      const response = await fetch("https://sandboxapi.rapyd.net" + url_path, options);
      const result = await response.json();

      console.log('📨 Réponse de Rapyd:', result);

      if (result.status && result.status.status === 'SUCCESS') {
        console.log('✅ Remboursement réussi!');
        await database.ref('orders/' + orderId).update({
          refundStatus: 'completed',
          refundedAt: new Date().toISOString(),
          refundAmount: orderData.total,
          rapydRefundId: result.data.id
        });
        return result;
      } else {
        const errorMsg = result.status ? 
          `Erreur Rapyd: ${result.status.message} (Code: ${result.status.error_code})` : 
          'Erreur inconnue de Rapyd';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('❌ Refund processing error:', error);
      throw error;
    }
  };

  const processRefundByTransfer = async (orderData) => {
    try {
      console.log('🔄 Début du remboursement par transfert inverse');
      
      const http_method = 'post';
      const url_path = '/v1/account/transfer';
      const salt = CryptoES.lib.WordArray.random(12);
      const timestamp = (Math.floor(new Date().getTime() / 1000) - 10).toString();
      const access_key = '8E34CFD95D661EF7946E';
      const secret_key = '5001ae0c57b14924dc361c69d2873c93246f9a22e26168ec514dfcaaa35e853bcd9c72c28dbca3c7';

      const body = JSON.stringify({
        "source_ewallet": "ewallet_8bf64b61b3133ff3076877c05d3d0d68",
        "amount": orderData.total,
        "currency": "USD",
        "destination_ewallet": "ewallet_6c61066d4528f18063ca4e78fcb54f3f",
        "metadata": {
          "merchant_defined": true,
          "reason": "remboursement_commande_rejetee",
          "orderId": orderId
        }
      });

      console.log('📦 Corps du transfert de remboursement:', body);

      const to_sign = http_method + url_path + salt + timestamp + access_key + secret_key + body;
      const signature = CryptoES.enc.Base64.stringify(CryptoES.enc.Utf8.parse(
        CryptoES.enc.Hex.stringify(CryptoES.HmacSHA256(to_sign, secret_key))
      ));

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_key': access_key,
          'salt': salt,
          'timestamp': timestamp,
          'signature': signature,
        },
        body: body
      };

      console.log('🌐 Envoi du transfert de remboursement...');
      const response = await fetch("https://sandboxapi.rapyd.net" + url_path, options);
      const result = await response.json();

      console.log('📨 Réponse du transfert:', result);

      if (result.status === 'SUCCESS') {
        console.log('✅ Transfert de remboursement réussi!');
        await database.ref('orders/' + orderId).update({
          refundStatus: 'completed',
          refundedAt: new Date().toISOString(),
          refundAmount: orderData.total,
          rapydRefundId: result.data.id,
          refundMethod: 'transfer'
        });
        return result;
      } else {
        const errorMsg = result.status ? 
          `Erreur transfert Rapyd: ${result.status.message}` : 
          'Erreur inconnue lors du transfert';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('❌ Transfer refund error:', error);
      throw error;
    }
  };

  const handleApprove = async () => {
    if (!orderId || !orderData) return;
    
    setProcessing(true);
    try {
      const currentUserName = getCurrentUserName();
      
      await database.ref('orders/' + orderId).update({
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: currentUserName,
        approvedById: currentUser ? currentUser.uid : 'system',
        approvedByRole: userData?.role || 'cashier'
      });

      Alert.alert(
        "Succès", 
        `Commande approuvée avec succès par ${currentUserName}!`,
        [{ text: "OK", onPress: resetCartPage }]
      );
    } catch (error) {
      console.error('Error approving order:', error);
      Alert.alert('Erreur', 'Impossible d\'approuver la commande.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!orderId || !orderData) return;
    
    const currentUserName = getCurrentUserName();
    
    Alert.alert(
      "Rejeter la commande",
      `Êtes-vous sûr de vouloir rejeter cette commande? Le paiement sera remboursé. (Action effectuée par: ${currentUserName})`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Rejeter", 
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              const currentUserName = getCurrentUserName();
              
              await database.ref('orders/' + orderId).update({
                status: "rejected",
                rejectedAt: new Date().toISOString(),
                rejectedBy: currentUserName,
                rejectedById: currentUser ? currentUser.uid : 'system',
                rejectedByRole: userData?.role || 'cashier',
                rejectionReason: `Rejeté par ${currentUserName} (${userData?.role || 'caissier'})`
              });

              let refundResult;
              try {
                console.log('🔄 Tentative de remboursement normal...');
                refundResult = await processRefund(orderData);
              } catch (refundError) {
                console.warn('❌ Remboursement normal échoué, tentative par transfert...', refundError.message);
                console.log('🔄 Tentative de remboursement par transfert inverse...');
                refundResult = await processRefundByTransfer(orderData);
              }

              Alert.alert(
                "Succès", 
                `Commande rejetée avec succès par ${currentUserName}! Le remboursement a été effectué.`,
                [{ text: "OK", onPress: resetCartPage }]
              );
            } catch (error) {
              console.error('❌ Error rejecting order:', error);
              
              const currentUserName = getCurrentUserName();
              
              await database.ref('orders/' + orderId).update({
                status: "rejected",
                rejectedAt: new Date().toISOString(),
                rejectedBy: currentUserName,
                rejectedById: currentUser ? currentUser.uid : 'system',
                rejectedByRole: userData?.role || 'cashier',
                rejectionReason: `Rejeté par ${currentUserName} - Erreur de remboursement`,
                refundStatus: 'failed',
                refundError: error.message
              });

              Alert.alert(
                "Commande rejetée - Erreur de remboursement", 
                `La commande a été rejetée par ${currentUserName} mais une erreur est survenue lors du remboursement: ${error.message}`,
                [{ text: "OK", onPress: resetCartPage }]
              );
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Rejetée';
      case 'completed': return 'Terminée';
      case 'failed': return 'Échouée';
      default: return status;
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'approved': return styles.statusApproved;
      case 'rejected': return styles.statusRejected;
      default: return styles.statusDefault;
    }
  };

  const getItems = () => orderData?.items || orderData?.cart || [];

  const calculateTotal = () => {
    const items = getItems();
    return items.reduce((total, item) => total + (item.subtotal || (item.price * item.quantity)), 0);
  };

  const renderItem = ({ item }) => (
    <TouchableHighlight style={styles.rowFront} underlayColor={'#AAA'}>
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.text || item.name}</Text>
          <Text style={styles.itemPrice}>
            ${item.price ? parseFloat(item.price).toFixed(2) : '0.00'} /unité
          </Text>
          {item.barcode && (
            <Text style={styles.itemBarcode}>Code: {item.barcode}</Text>
          )}
        </View>

        <View style={styles.quantityContainer}>
          <InputSpinner
            min={1}
            step={1}
            skin="paper"
            width={100}
            colorMax={"#f04048"}
            colorMin={"#40c5f4"}
            editable={false}
            value={item.quantity}
          />
        </View>

        <View style={styles.subtotalContainer}>
          <Text style={styles.subtotalText}>
            ${(item.subtotal || (item.price * item.quantity)).toFixed(2)}
          </Text>
        </View>
      </View>
    </TouchableHighlight>
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Chargement de la commande...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (noOrder) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Aucune commande scannée</Text>
          <Text style={styles.emptySubtitle}>Scannez un QR code de commande pour la traiter</Text>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={() => navigation.navigate("Scan")}
          >
            <Text style={styles.scanButtonText}>Scanner une commande</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  if (!orderData) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Aucune commande chargée</Text>
          <TouchableOpacity style={styles.backButton} onPress={resetCartPage}>
            <Text style={styles.backButtonText}>Scanner une commande</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const items = getItems();
  const total = orderData.total || calculateTotal();
  const isProcessed = orderData.status === 'approved' || orderData.status === 'rejected';

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.orderTitle}>Commande #{orderId}</Text>
        <View style={[styles.statusBadge, getStatusStyle(orderData.status)]}>
          <Text style={styles.statusText}>{getStatusText(orderData.status)}</Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>
          Client: {orderData.userName || orderData.userEmail || 'Non spécifié'}
        </Text>
        <Text style={styles.orderDate}>
          Date: {new Date(orderData.createdAt).toLocaleDateString('fr-FR')}
        </Text>
        {orderData.paymentMethod && (
          <Text style={styles.paymentMethod}>
            Paiement: {orderData.paymentMethod}
          </Text>
        )}
        {userData && (
          <Text style={styles.currentUserInfo}>
            Connecté en tant que: {userData.username} ({userData.role})
          </Text>
        )}
        {orderData.storeName && (
          <Text style={styles.storeInfo}>
            Magasin: {orderData.storeName}
          </Text>
        )}
      </View>

      <View style={styles.listContainer}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun article dans cette commande</Text>
          </View>
        ) : (
          <SwipeListView
            data={items}
            renderItem={renderItem}
            keyExtractor={(item, index) => item.barcode || index.toString()}
            scrollEnabled={true}
          />
        )}
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.rejectButton,
            (isProcessed || processing) && styles.disabledButton
          ]}
          onPress={handleReject}
          disabled={isProcessed || processing}
        >
          {processing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>Rejeter</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.approveButton,
            (isProcessed || processing) && styles.disabledButton
          ]}
          onPress={handleApprove}
          disabled={isProcessed || processing}
        >
          {processing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>Approuver</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#003f5c",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  scanButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#d9534f',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#338BA8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003f5c',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusPending: {
    backgroundColor: '#fff3cd',
  },
  statusApproved: {
    backgroundColor: '#d4edda',
  },
  statusRejected: {
    backgroundColor: '#f8d7da',
  },
  statusDefault: {
    backgroundColor: '#e2e3e5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customerInfo: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  currentUserInfo: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 5,
  },
  storeInfo: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  listContainer: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemBarcode: {
    fontSize: 12,
    color: '#999',
  },
  quantityContainer: {
    width: 100,
    justifyContent: "center",
    alignItems: 'center',
  },
  subtotalContainer: {
    width: 80,
    justifyContent: "center",
    alignItems: 'flex-end',
  },
  subtotalText: {
    fontWeight: "bold",
    fontSize: 16,
    color: '#2c5530',
  },
  totalContainer: {
    padding: 15,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5530',
  },
  footer: {
    height: 70,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  rowFront: {
    backgroundColor: '#FFF',
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
});

export default Cart;