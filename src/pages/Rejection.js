import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
} from "react-native";
import LottieView from 'lottie-react-native';

export const Rejection = ({ navigation, route }) => {
    // Récupérer l'orderId depuis les paramètres ou global
    const orderId = route.params?.orderId || global.id_code;

    const handleBackToScan = () => {
        navigation.navigate("BarcodeView");
    };

    const handleViewDetails = () => {
        navigation.navigate("Cart", { scannedOrderId: orderId });
    };

    return (
        <View style={styles.container}>
            {/* Animation de rejet */}
            <LottieView
                style={styles.animation}
                source = {require("../../assets/64248-checkmark.json")} // Remplacez par une animation de croix si disponible
                autoPlay={true}
                loop={false}
            />
            
            {/* Message principal */}
            <Text style={styles.title}>Commande rejetée</Text>
            
            {/* Explication */}
            <View style={styles.messageContainer}>
                <Text style={styles.message}>
                    La commande a été rejetée et ne pourra pas être traitée.
                </Text>
                <Text style={styles.subMessage}>
                    Veuillez contacter un assistant pour plus d'informations.
                </Text>
            </View>

            {/* Détails de la commande */}
            <View style={styles.orderInfo}>
                <Text style={styles.orderLabel}>Numéro de commande</Text>
                <Text style={styles.orderNumber}>#{orderId}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleBackToScan}
                >
                    <Text style={styles.buttonText}>Nouveau scan</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleViewDetails}
                >
                    <Text style={styles.secondaryButtonText}>Voir les détails</Text>
                </TouchableOpacity>
            </View>

            {/* Informations supplémentaires */}
            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Prochaines étapes</Text>
                <Text style={styles.infoText}>
                    • Le client a été notifié du rejet{'\n'}
                    • La commande a été archivée{'\n'}
                    • Contactez le support si nécessaire
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    animation: {
        width: 200,
        height: 200,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#dc3545',
        textAlign: 'center',
        marginBottom: 15,
    },
    messageContainer: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 12,
        marginBottom: 25,
        width: '100%',
        alignItems: 'center',
    },
    message: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 24,
    },
    subMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    orderInfo: {
        backgroundColor: '#fff3cd',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ffeaa7',
        marginBottom: 25,
        width: '100%',
        alignItems: 'center',
    },
    orderLabel: {
        fontSize: 14,
        color: '#856404',
        marginBottom: 5,
    },
    orderNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#856404',
    },
    actionsContainer: {
        width: '100%',
        marginBottom: 30,
    },
    button: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButton: {
        backgroundColor: '#338BA8',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#338BA8',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    secondaryButtonText: {
        color: '#338BA8',
        fontSize: 16,
        fontWeight: '600',
    },
    infoBox: {
        backgroundColor: '#e9ecef',
        padding: 15,
        borderRadius: 10,
        width: '100%',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#495057',
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: '#6c757d',
        lineHeight: 20,
    },
});