import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
// Changement ici : on utilise expo-camera
import { CameraView, useCameraPermissions } from 'expo-camera';
import LottieView from 'lottie-react-native';

export const BarcodeView = ({ navigation }) => {
    // Utilisation du nouveau hook pour les permissions
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Initialisation des permissions
    useEffect(() => {
        if (!permission) {
            requestPermission();
        }
    }, [permission]);

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned || isProcessing) return;
        
        setIsProcessing(true);
        setScanned(true);
        
        try {
            const orderId = data.toString();
            
            // Validation basique de l'orderId
            if (!orderId || orderId.length < 5) {
                Alert.alert("QR Code invalide", "Le code scanné n'est pas valide.");
                setTimeout(() => setScanned(false), 2000);
                setIsProcessing(false);
                return;
            }

            // Stocker l'ID de commande
            global.id_code = orderId;
            
            Alert.alert(
                "Commande scannée", 
                `Commande #${orderId} scannée avec succès!`,
                [
                    { 
                        text: "Voir les détails", 
                        onPress: () => {
                            navigation.navigate("Cart", { scannedOrderId: orderId });
                            setIsProcessing(false);
                        }
                    },
                    { 
                        text: "Scanner à nouveau", 
                        style: "cancel",
                        onPress: () => {
                            setScanned(false);
                            setIsProcessing(false);
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('Error processing QR code:', error);
            Alert.alert("Erreur", "Impossible de traiter le QR code.");
            setScanned(false);
            setIsProcessing(false);
        }
    };

    const resetScanner = () => {
        setScanned(false);
        setIsProcessing(false);
    };

    // Gestion des états de permission avec le nouvel objet permission
    if (!permission) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.message}>Demande d'autorisation pour la caméra...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorMessage}>Accès à la caméra refusé</Text>
                <Text style={styles.subMessage}>
                    L'application a besoin de la caméra pour scanner les QR codes
                </Text>
                <TouchableOpacity 
                    style={styles.button}
                    onPress={requestPermission}
                >
                    <Text style={styles.buttonText}>Autoriser la caméra</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Remplacement de BarCodeScanner par CameraView */}
            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"], // Optimise pour ne scanner que les QR codes
                }}
                style={StyleSheet.absoluteFillObject}
            />
            
            {/* Overlay avec cadre de scan - STYLE ET LOGIQUE CONSERVÉS */}
            <View style={styles.overlay}>
                <View style={styles.scanFrame}>
                    <LottieView
                        style={styles.scanAnimation}
                        source={require("../../assets/16589-qrcode-scanner.json")}
                        autoPlay={true}
                        loop={true}
                    />
                </View>
                
                <Text style={styles.instruction}>
                    Scannez le QR code de la commande
                </Text>
                
                {scanned && (
                    <View style={styles.scanStatus}>
                        <Text style={styles.scanStatusText}>
                            {isProcessing ? "Traitement..." : "Code scanné!"}
                        </Text>
                    </View>
                )}
            </View>

            {/* Bouton pour réinitialiser le scan - STYLE ET LOGIQUE CONSERVÉS */}
            {scanned && (
                <TouchableOpacity 
                    style={styles.resetButton}
                    onPress={resetScanner}
                    disabled={isProcessing}
                >
                    <Text style={styles.resetButtonText}>
                        {isProcessing ? "Traitement..." : "Scanner à nouveau"}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// Les styles restent strictement identiques à votre code original
const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
    },
    errorMessage: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#d9534f',
        marginBottom: 10,
    },
    subMessage: {
        fontSize: 14,
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    scanFrame: {
        width: 250,
        height: 250,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 30,
    },
    scanAnimation: {
        width: 200,
        height: 200,
    },
    instruction: {
        fontSize: 16,
        color: 'white',
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 20,
    },
    scanStatus: {
        position: 'absolute',
        top: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    scanStatusText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    resetButton: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: '#338BA8',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    resetButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#338BA8',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        marginTop: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});