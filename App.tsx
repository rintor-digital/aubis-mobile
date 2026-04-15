import { useRef, useState, useCallback, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  BackHandler,
  Platform,
  Linking,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Constants from "expo-constants";

const APP_URL = "https://aubis.com.au";

const ALLOWED_HOSTS = [
  "aubis.com.au",
  "www.aubis.com.au",
  "01de0ff3-cfb1-460a-9713-f65bfa9f8910-00-3cveu81jfnjyk.worf.replit.dev",
  "replit.com",
];

function isExternalUrl(url: string): boolean {
  if (/^mailto:|^tel:/.test(url)) return true;
  try {
    const parsed = new URL(url);
    return !ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith("." + host)
    );
  } catch {
    return false;
  }
}

function MainApp() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => handler.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = useCallback(
    (navState: { canGoBack: boolean; url: string }) => {
      setCanGoBack(navState.canGoBack);
    },
    []
  );

  const handleShouldStartLoad = useCallback(
    (event: { url: string }): boolean => {
      if (isExternalUrl(event.url)) {
        Linking.openURL(event.url);
        return false;
      }
      return true;
    },
    []
  );

  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    setError(
      `Could not load AUBIS.\n\nError: ${nativeEvent.description || nativeEvent.code || "Unknown error"}\n\nURL: ${APP_URL}`
    );
    setIsLoading(false);
  }, []);

  const handleHttpError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    if (nativeEvent.statusCode >= 400) {
      setError(
        `Server returned error ${nativeEvent.statusCode}.\n\nURL: ${nativeEvent.url}`
      );
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  const injectedJS = `
    (function() {
      window.__AUBIS_NATIVE__ = true;
      window.__AUBIS_PLATFORM__ = '${Platform.OS}';

      var meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute('content', 
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
        );
      }

      var style = document.createElement('style');
      style.textContent = \`
        .pwa-install-prompt, .pwa-install-banner { display: none !important; }
        body { 
          -webkit-user-select: none;
          overscroll-behavior-y: none;
        }
      \`;
      document.head.appendChild(style);
    })();
    true;
  `;

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" backgroundColor="#0d9488" translucent={false} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Issue</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#0d9488" translucent={false} />

      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadEnd={() => setIsLoading(false)}
        onError={handleError}
        onHttpError={handleHttpError}
        injectedJavaScript={injectedJS}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode="never"
        cacheEnabled={true}
        pullToRefreshEnabled={true}
        allowsFullscreenVideo={true}
        setSupportMultipleWindows={false}
        overScrollMode="never"
        decelerationRate="normal"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={["https://*", "http://*"]}
        userAgent={`AUBIS-Native/${Constants.expoConfig?.version || "1.0.0"} (${Platform.OS})`}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Loading AUBIS...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d9488",
  },
  webview: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0d9488",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  errorText: {
    color: "#ccfbf1",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retryText: {
    color: "#0d9488",
    fontSize: 16,
    fontWeight: "bold",
  },
});
