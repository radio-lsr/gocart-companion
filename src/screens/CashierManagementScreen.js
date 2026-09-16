// screens/CashierManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database, app } from '../../config/firebase';

export const CashierManagementScreen = ({ navigation }) => {
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [currentUserStoreId, setCurrentUserStoreId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Récupérer les infos de l'utilisateur connecté (son storeId)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const user = app.auth().currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        navigation.goBack();
        return;
      }
      try {
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        const userData = userSnapshot.val();
        if (userData) {
          setCurrentUserStoreId(userData.storeId);
          setCurrentUserRole(userData.role);
        }
      } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Charger les caissiers du magasin de l'utilisateur
  useEffect(() => {
    if (!currentUserStoreId) return;

    const cashiersRef = database.ref('users');
    const handleDataChange = (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const cashiersList = [];
        
        Object.keys(usersData).forEach(userId => {
          const user = usersData[userId];
          // Filtrer par rôle caissier ET par storeId correspondant
          if (user.role === 'caissier' && user.storeId === currentUserStoreId) {
            cashiersList.push({
              id: userId,
              ...user
            });
          }
        });
        
        setCashiers(cashiersList);
      } else {
        setCashiers([]);
      }
      setLoading(false);
      setRefreshing(false);
    };

    cashiersRef.on('value', handleDataChange);

    return () => cashiersRef.off('value', handleDataChange);
  }, [currentUserStoreId]);

  const loadCashiers = async () => {
    if (!currentUserStoreId) return;
    try {
      setLoading(true);
      const usersSnapshot = await database.ref('users').once('value');
      
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        const cashiersList = [];
        
        Object.keys(usersData).forEach(userId => {
          const user = usersData[userId];
          if (user.role === 'caissier' && user.storeId === currentUserStoreId) {
            cashiersList.push({
              id: userId,
              ...user
            });
          }
        });
        
        setCashiers(cashiersList);
      } else {
        setCashiers([]);
      }
    } catch (error) {
      console.error('Error loading cashiers:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des caissiers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCashiers();
  };

  const handleApprove = async (cashierId) => {
    Alert.alert(
      'Approuver le caissier',
      'Êtes-vous sûr de vouloir approuver ce caissier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          onPress: async () => {
            try {
              await database.ref(`users/${cashierId}`).update({
                status: 'approved',
                approvedAt: new Date().toISOString(),
                approvedBy: app.auth().currentUser?.uid
              });
              
              Alert.alert('Succès', 'Caissier approuvé avec succès');
            } catch (error) {
              console.error('Error approving cashier:', error);
              Alert.alert('Erreur', 'Impossible d\'approuver le caissier');
            }
          }
        }
      ]
    );
  };

  const handleReject = async (cashierId) => {
    Alert.alert(
      'Rejeter le caissier',
      'Êtes-vous sûr de vouloir rejeter ce caissier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.ref(`users/${cashierId}`).update({
                status: 'rejected',
                rejectedAt: new Date().toISOString(),
                rejectedBy: app.auth().currentUser?.uid
              });
              
              Alert.alert('Succès', 'Caissier rejeté');
            } catch (error) {
              console.error('Error rejecting cashier:', error);
              Alert.alert('Erreur', 'Impossible de rejeter le caissier');
            }
          }
        }
      ]
    );
  };

  const handleDelete = async (cashierId) => {
    Alert.alert(
      'Supprimer le caissier',
      'Cette action est irréversible. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.ref(`users/${cashierId}`).remove();
              
              Alert.alert('Succès', 'Caissier supprimé');
            } catch (error) {
              console.error('Error deleting cashier:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le caissier');
            }
          }
        }
      ]
    );
  };

  const handleResetStatus = async (cashierId) => {
    Alert.alert(
      'Réinitialiser le statut',
      'Remettre ce caissier en attente ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          onPress: async () => {
            try {
              await database.ref(`users/${cashierId}`).update({
                status: 'pending',
                approvedAt: null,
                approvedBy: null,
                rejectedAt: null,
                rejectedBy: null
              });
              
              Alert.alert('Succès', 'Statut réinitialisé');
            } catch (error) {
              console.error('Error resetting status:', error);
              Alert.alert('Erreur', 'Impossible de réinitialiser le statut');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FFA500',
      approved: '#4CAF50',
      rejected: '#F44336',
    };
    return colors[status] || '#666';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté',
    };
    return texts[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredCashiers = cashiers.filter(cashier => {
    if (filter === 'all') return true;
    return cashier.status === filter;
  });

  if (loading || !currentUserStoreId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Chargement des caissiers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Gestion des Caissiers</Text>
        {/* ✅ Bouton Ajouter modifié pour passer storeId et rôle */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('SignUp', { 
            storeId: currentUserStoreId, 
            role: 'caissier' 
          })}
        >
          <Ionicons name="person-add-outline" size={20} color="#FF1493" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques rapides */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{cashiers.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {cashiers.filter(c => c.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Approuvés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {cashiers.filter(c => c.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
      </View>

      {/* Filtres */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {[
          { key: 'all', label: 'Tous' },
          { key: 'pending', label: 'En attente' },
          { key: 'approved', label: 'Approuvés' },
          { key: 'rejected', label: 'Rejetés' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.filterButton,
              filter === item.key && styles.filterButtonActive
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[
              styles.filterText,
              filter === item.key && styles.filterTextActive
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.cashiersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.cashiersContent}
      >
        {filteredCashiers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateTitle}>Aucun caissier</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' 
                ? "Aucun caissier trouvé pour votre magasin" 
                : `Aucun caissier ${getStatusText(filter).toLowerCase()}`
              }
            </Text>
            <TouchableOpacity 
              style={styles.addFirstButton}
              onPress={() => navigation.navigate('SignUp', { 
                storeId: currentUserStoreId, 
                role: 'caissier' 
              })}
            >
              <Text style={styles.addFirstButtonText}>Ajouter un caissier</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredCashiers.map((cashier) => (
            <View key={cashier.id} style={styles.cashierCard}>
              <View style={styles.cashierHeader}>
                <View style={styles.cashierInfo}>
                  <Text style={styles.cashierName}>{cashier.username || 'Nom non renseigné'}</Text>
                  <Text style={styles.cashierEmail}>{cashier.email || 'Email non renseigné'}</Text>
                  {cashier.phone && (
                    <Text style={styles.cashierPhone}>{cashier.phone}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(cashier.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(cashier.status)}</Text>
                </View>
              </View>

              <View style={styles.cashierDetails}>
                <Text style={styles.marketName}>{cashier.marketName || 'Supermarché non spécifié'}</Text>
                <Text style={styles.creationDate}>
                  Inscrit le {formatDate(cashier.createdAt)}
                </Text>
                
                {cashier.approvedAt && (
                  <Text style={styles.approvalDate}>
                    Approuvé le {formatDate(cashier.approvedAt)}
                  </Text>
                )}
                
                {cashier.rejectedAt && (
                  <Text style={styles.rejectionDate}>
                    Rejeté le {formatDate(cashier.rejectedAt)}
                  </Text>
                )}
              </View>

              <View style={styles.actionButtons}>
                {cashier.status === 'pending' && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApprove(cashier.id)}
                    >
                      <Ionicons name="checkmark" size={16} color="white" />
                      <Text style={styles.actionButtonText}>Approuver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(cashier.id)}
                    >
                      <Ionicons name="close" size={16} color="white" />
                      <Text style={styles.actionButtonText}>Rejeter</Text>
                    </TouchableOpacity>
                  </>
                )}

                {(cashier.status === 'approved' || cashier.status === 'rejected') && (
                  <>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.resetButton]}
                      onPress={() => handleResetStatus(cashier.id)}
                    >
                      <Ionicons name="refresh" size={16} color="white" />
                      <Text style={styles.actionButtonText}>Réinitialiser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(cashier.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="white" />
                      <Text style={styles.actionButtonText}>Supprimer</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  addButtonText: {
    color: '#FF1493',
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF1493',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#FF1493',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  cashiersList: {
    flex: 1,
  },
  cashiersContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 20,
  },
  addFirstButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  cashierCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cashierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cashierInfo: {
    flex: 1,
  },
  cashierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cashierEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cashierPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  cashierDetails: {
    marginBottom: 12,
  },
  marketName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  creationDate: {
    fontSize: 12,
    color: '#999',
  },
  approvalDate: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  rejectionDate: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  resetButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#666',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default CashierManagementScreen;