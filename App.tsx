import { useRef, useState, useCallback, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  BackHandler,
  Platform,
  Linking,
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
];

function isExternalUrl(url: string): boolean {
  if (/^mailto:|^tel:/.test(url)) return true;
  try {
    const parsed = new URL(url);
    return !ALLOWED_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function MainApp() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
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
        originWhitelist={["https://*"]}
        userAgent={`AUBIS-Native/${Constants.expoConfig?.version || "1.0.0"} (${Platform.OS})`}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#ffffff" />
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
});
