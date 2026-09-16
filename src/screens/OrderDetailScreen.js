// screens/OrderDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { app, database } from '../../config/firebase';

export const OrderDetailScreen = ({ navigation, route }) => {
  const { order } = route.params;
  const [updating, setUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);

  // Récupérer l'utilisateur actuel
  useEffect(() => {
    const user = app.auth().currentUser;
    setCurrentUser(user);
    
    if (user) {
      // Récupérer les données utilisateur
      const fetchUserData = async () => {
        try {
          const userSnapshot = await database.ref('users/' + user.uid).once('value');
          const userDataFromDB = userSnapshot.val();
          setUserData(userDataFromDB);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      fetchUserData();
    }
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FFA500',
      completed: '#4CAF50',
      cancelled: '#F44336',
    };
    return colors[status] || '#666';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'En attente',
      completed: 'Terminée',
      cancelled: 'Annulée',
    };
    return texts[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotalItems = (cart) => {
    if (!cart) return 0;
      
    try {
        // Gère à la fois les tableaux et les objets
        const items = Array.isArray(cart) ? cart : Object.values(cart);
        return items.reduce((total, item) => total + (item.quantity || 0), 0);
    } catch (error) {
        console.error('Error calculating total items:', error);
        return 0;
    }
  };

  const calculateSubtotal = (cart) => {
    if (!cart || !Array.isArray(cart)) return 0;
    return cart.reduce((total, item) => total + ((item.quantity || 0) * (item.price || 0)), 0);
  };

  // 🆕 FONCTION POUR OBTENIR LE NOM DE L'UTILISATEUR ACTUEL
  const getCurrentUserName = () => {
    if (userData && userData.username) {
      return userData.username;
    }
    if (currentUser && currentUser.displayName) {
      return currentUser.displayName;
    }
    return currentUser ? currentUser.email : 'Administrateur';
  };

  const handleUpdateStatus = async (newStatus) => {
    Alert.alert(
      `Changer le statut en "${getStatusText(newStatus)}"`,
      `Êtes-vous sûr de vouloir marquer cette commande comme ${getStatusText(newStatus).toLowerCase()} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              setUpdating(true);
              
              // 🆕 AJOUT DU NOM DE L'UTILISATEUR QUI A MODIFIÉ LE STATUT
              const updatedByUser = getCurrentUserName();
              const updateData = {
                status: newStatus,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser ? currentUser.uid : 'system',
                updatedByName: updatedByUser,
                // 🆕 AJOUT DE LA DATE ET HEURE DE LA MODIFICATION
                statusUpdatedAt: new Date().toISOString()
              };

              // Si la commande est complétée, on enregistre aussi qui l'a approuvée
              if (newStatus === 'completed') {
                updateData.approvedBy = currentUser ? currentUser.uid : 'system';
                updateData.approvedByName = updatedByUser;
                updateData.approvedAt = new Date().toISOString();
              }

              // Si la commande est annulée, on enregistre aussi qui l'a rejetée
              if (newStatus === 'cancelled') {
                updateData.cancelledBy = currentUser ? currentUser.uid : 'system';
                updateData.cancelledByName = updatedByUser;
                updateData.cancelledAt = new Date().toISOString();
              }

              // Mettre à jour le statut dans Firebase
              await database.ref(`orders/${order.id}`).update(updateData);
              
              Alert.alert('Succès', `Statut mis à jour: ${getStatusText(newStatus)}`);
              navigation.goBack();
            } catch (error) {
              console.error('Error updating order status:', error);
              Alert.alert('Erreur', 'Impossible de mettre à jour le statut de la commande');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleContactCustomer = () => {
    Alert.alert(
      'Contacter le client',
      `Appeler ${order.customerName || 'le client'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler', onPress: () => console.log('Appeler le client') }
      ]
    );
  };

  // Fonction pour générer un numéro de commande si absent
  const getOrderNumber = () => {
    return order.orderNumber || `CMD-${order.id ? order.id.slice(-6).toUpperCase() : '000000'}`;
  };

  // 🆕 FONCTION POUR AFFICHER QUI A MODIFIÉ LE STATUT
  const renderStatusUpdaterInfo = () => {
    if (order.updatedByName) {
      return (
        <View style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={20} color="#666" />
          <Text style={styles.infoLabel}>Modifié par:</Text>
          <Text style={styles.infoValue}>{order.updatedByName}</Text>
        </View>
      );
    }
    return null;
  };

  // 🆕 FONCTION POUR AFFICHER QUI A APPROUVÉ LA COMMANDE
  const renderApproverInfo = () => {
    if (order.approvedBy && (order.status === 'approved' || order.status === 'completed')) {
      return (
        <View style={styles.infoRow}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
          <Text style={styles.infoLabel}>Approuvé par:</Text>
          <Text style={[styles.infoValue, { color: '#4CAF50' }]}>{order.approvedBy}</Text>
        </View>
      );
    }
    return null;
  };

  // 🆕 FONCTION POUR AFFICHER QUI A ANNULÉ LA COMMANDE
  const renderCancellerInfo = () => {
    if (order.cancelledBy && (order.status === 'rejected' || order.status === 'cancelled')) {
      return (
        <View style={styles.infoRow}>
          <Ionicons name="close-circle-outline" size={20} color="#F44336" />
          <Text style={styles.infoLabel}>Annulé par:</Text>
          <Text style={[styles.infoValue, { color: '#F44336' }]}>{order.cancelledBy}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Détails de la Commande</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {/* En-tête de la commande */}
        <View style={styles.orderHeader}>
          <View style={styles.orderNumberContainer}>
            <Text style={styles.orderNumber}>{getOrderNumber()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
            </View>
          </View>
          
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>

        {/* Informations client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations Client</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Nom:</Text>
              <Text style={styles.infoValue}>{order.customerName || 'Client non renseigné'}</Text>
            </View>
            {order.customerPhone && (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Téléphone:</Text>
                <Text style={styles.infoValue}>{order.customerPhone}</Text>
              </View>
            )}
            {order.customerEmail && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{order.customerEmail}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.contactButton} onPress={handleContactCustomer}>
              <Ionicons name="chatbubble-outline" size={16} color="#FF1493" />
              <Text style={styles.contactButtonText}>Contacter le client</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Articles de la commande */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Articles ({calculateTotalItems(order.cart)})
          </Text>
          <View style={styles.itemsCard}>
            {order.cart && order.cart.length > 0 ? (
              <>
                {order.cart.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.text || 'Produit sans nom'}</Text>
                      <Text style={styles.itemPrice}>{(item.price || 0).toFixed(2)}$ l'unité</Text>
                    </View>
                    <View style={styles.itemQuantity}>
                      <Text style={styles.quantityText}>x{item.quantity || 0}</Text>
                      <Text style={styles.itemTotal}>
                        {((item.quantity || 0) * (item.price || 0)).toFixed(2)}$
                      </Text>
                    </View>
                  </View>
                ))}
                
                {/* Sous-total */}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.total}>{calculateSubtotal(order.cart).toFixed(2)}$</Text>
                </View>
              </>
            ) : (
              <Text style={styles.noItemsText}>Aucun article dans cette commande</Text>
            )}
          </View>
        </View>

        {/* Informations de paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations de Paiement</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Méthode:</Text>
              <Text style={styles.infoValue}>{order.paymentMethod || 'Non spécifiée'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Montant total:</Text>
              <Text style={styles.totalOrderAmount}>{(order.total || 0).toFixed(2)}$</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Statut paiement:</Text>
              <Text style={[styles.infoValue, { color: order.paymentStatus === 'paid' ? '#4CAF50' : '#FF9800' }]}>
                {order.paymentStatus === 'paid' ? 'Payé' : 'En attente'}
              </Text>
            </View>
          </View>
        </View>

        {/* 🆕 INFORMATIONS SUR LES APPROBATIONS/REJETS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique des Modifications</Text>
          <View style={styles.infoCard}>
            {/* Afficher qui a approuvé la commande */}
            {renderApproverInfo()}
            
            {/* Afficher qui a annulé la commande */}
            {renderCancellerInfo()}
            
            {/* Afficher qui a modifié le statut */}
            {renderStatusUpdaterInfo()}
            
            {/* Date de création */}
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Créée le:</Text>
              <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
            </View>
            
            {/* Date de dernière modification */}
            {order.updatedAt && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Dernière modification:</Text>
                <Text style={styles.infoValue}>{formatDate(order.updatedAt)}</Text>
              </View>
            )}
            
            {/* Date d'approbation */}
            {order.approvedAt && (
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-outline" size={20} color="#4CAF50" />
                <Text style={styles.infoLabel}>Approuvée le:</Text>
                <Text style={styles.infoValue}>{formatDate(order.approvedAt)}</Text>
              </View>
            )}
            
            {/* Date d'annulation */}
            {order.cancelledAt && (
              <View style={styles.infoRow}>
                <Ionicons name="close-outline" size={20} color="#F44336" />
                <Text style={styles.infoLabel}>Annulée le:</Text>
                <Text style={styles.infoValue}>{formatDate(order.cancelledAt)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        {(order.status === 'pending' || order.status === 'completed') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionsCard}>
              {order.status === 'pending' && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleUpdateStatus('approved')}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Approuver</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {order.status !== 'cancelled' && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => handleUpdateStatus('rejected')}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={20} color="white" />
                      <Text style={styles.actionButtonText}>
                        {order.status === 'completed' ? 'Annuler la commande' : 'Annuler'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {order.status === 'completed' && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.pendingButton]}
                  onPress={() => handleUpdateStatus('pending')}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Remettre en attente</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>
              {order.notes || "Aucune note particulière pour cette commande."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  orderHeader: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderNumberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF1493',
    borderRadius: 8,
    marginTop: 8,
  },
  contactButtonText: {
    color: '#FF1493',
    fontWeight: '600',
    marginLeft: 8,
  },
  itemsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    color: '#666',
  },
  itemQuantity: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  noItemsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalOrderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  pendingButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  notesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default OrderDetailScreen;