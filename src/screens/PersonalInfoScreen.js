// screens/PersonalInfoScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { app, database } from '../../config/firebase';

export const PersonalInfoScreen = ({ navigation }) => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    phone: '',
    marketName: '',
    location: '',
    role: '',
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = app.auth().currentUser;
      if (user) {
        const userSnapshot = await database.ref('users/' + user.uid).once('value');
        const data = userSnapshot.val();
        
        if (data) {
          setUserData({
            username: data.username || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            marketName: data.marketName || '',
            location: data.location || '',
            role: data.role || '',
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userData.username || !userData.marketName) {
      Alert.alert('Erreur', 'Le nom et le nom du supermarché sont obligatoires');
      return;
    }

    setSaving(true);

    try {
      const user = app.auth().currentUser;
      await database.ref('users/' + user.uid).update({
        username: userData.username,
        phone: userData.phone,
        marketName: userData.marketName,
        location: userData.location,
      });

      // Mettre à jour le displayName dans Firebase Auth
      await user.updateProfile({
        displayName: userData.username
      });

      Alert.alert('Succès', 'Informations mises à jour avec succès');
      setEditing(false);
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les informations');
    } finally {
      setSaving(false);
    }
  };

  const getRoleDisplay = (role) => {
    const roles = {
      'admin': 'Administrateur',
      'caissier': 'Caissier'
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1493" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Informations Personnelles</Text>
          {!editing ? (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={20} color="#FF1493" />
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setEditing(false);
                loadUserData(); // Recharger les données originales
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          {/* Carte d'informations */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom d'utilisateur</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={userData.username}
                  onChangeText={(text) => setUserData({...userData, username: text})}
                  placeholder="Entrez votre nom"
                />
              ) : (
                <Text style={styles.infoValue}>{userData.username}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userData.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={userData.phone}
                  onChangeText={(text) => setUserData({...userData, phone: text})}
                  placeholder="Numéro de téléphone"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{userData.phone || 'Non renseigné'}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SuperMarché</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={userData.marketName}
                  onChangeText={(text) => setUserData({...userData, marketName: text})}
                  placeholder="Nom du supermarché"
                />
              ) : (
                <Text style={styles.infoValue}>{userData.marketName}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Localisation</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={userData.location}
                  onChangeText={(text) => setUserData({...userData, location: text})}
                  placeholder="Ville, Pays"
                />
              ) : (
                <Text style={styles.infoValue}>{userData.location || 'Non renseignée'}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rôle</Text>
              <View style={[styles.roleBadge, userData.role === 'admin' ? styles.adminBadge : styles.cashierBadge]}>
                <Text style={styles.roleText}>{getRoleDisplay(userData.role)}</Text>
              </View>
            </View>
          </View>

          {editing && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Sauvegarder</Text>
                </>
              )}
            </TouchableOpacity>
          )}
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
  scrollContent: {
    flexGrow: 1,
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  editButtonText: {
    color: '#FF1493',
    fontWeight: '600',
    marginLeft: 4,
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  input: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#FF1493',
    paddingVertical: 4,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  adminBadge: {
    backgroundColor: '#E3F2FD',
  },
  cashierBadge: {
    backgroundColor: '#E8F5E8',
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#FF1493',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PersonalInfoScreen;