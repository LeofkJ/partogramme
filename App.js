import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import { useEffect, useRef, useState } from "react";
import { AppState, LogBox, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NavBar, NAVBAR_ENABLED } from "./src/components/NavBar/NavBar";
import { AlertBanner } from "./src/components/AlertBanner/AlertBanner";
import { OfflineBanner } from "./src/components/OfflineBanner/OfflineBanner";
import { DialogTransferOutcome } from "./src/components/Dialogs/DialogTransferOutcome";
import { MaternityTransferRequestsPanel } from "./src/components/MaternityTransferRequestsPanel";
import { navigationRef } from "./src/navigationRef";
import { rootStore } from "./src/store/rootStore";
import { colors, radius, spacing, type } from "./src/theme";
import * as Sentry from "./src/lib/sentry";
import { logger } from "./src/lib/logger";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { ScreenLogin } from "./src/screens/Login/Login";
import { ScreenMenu } from "./src/screens/Menu/Menu";
import { ScreenAddPartogramme } from "./src/screens/AddPartogramme/AddPartogramme";
import { ScreenGraph } from "./src/screens/Graph/Graph";
import { ScreenProfile } from "./src/screens/Profile/Profile";
import { ScreenAdmin } from "./src/screens/Admin/Admin";
import { ScreenHospitalDashboard } from "./src/screens/HospitalDashboard/HospitalDashboard";
import { MainTabs } from "./src/navigation/MainTabs";

// react-native-paper-dates (the date/time pickers) renders through
// react-native-paper components, which default to Paper's stock purple
// theme without a Provider, this keeps them on the app's actual palette.
const paperTheme = {
  ...MD3LightTheme,
  roundness: radius.sm,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.accent,
    onPrimary: colors.onAccent,
    secondary: colors.accent,
    surface: colors.surface,
    background: colors.background,
    outline: colors.borderStrong,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
  },
};

Sentry.init({
  dsn: "https://e271b157764ea5f872c2b1dc71bddbef@o4511666575441920.ingest.us.sentry.io/4511666598641664",
  enableInExpoDevelopment: true,
});

// Known no-op warning from RN's legacy Animated native module — fires any
// time a native-driven Animated value updates with no JS-side listener
// attached (e.g. react-navigation's own screen-transition animations).
// Purely internal bookkeeping noise, not something app code can trigger or
// fix directly; safe to ignore. See facebook/react-native#31693.
LogBox.ignoreLogs(["Sending `onAnimatedValueUpdate` with no listeners registered"]);

// Sentry.wrap(App) below only adds touch/profiler tracking, not a crash
// boundary — without this, any render error anywhere in the tree (a bad
// date parse, an unexpected data shape) takes the whole app to a blank
// white screen with no recovery short of force-quitting, possibly mid-labor.
const ErrorFallback = ({ resetError }) => (
  <View style={errorFallbackStyles.body}>
    <Text style={errorFallbackStyles.title}>Une erreur est survenue.</Text>
    <Text style={errorFallbackStyles.message}>
      L'application a rencontré un problème inattendu. Vous pouvez réessayer, ou redémarrer l'application si le problème persiste.
    </Text>
    <TouchableOpacity style={errorFallbackStyles.button} onPress={resetError} activeOpacity={0.8}>
      <Text style={errorFallbackStyles.buttonText}>Réessayer</Text>
    </TouchableOpacity>
  </View>
);

const errorFallbackStyles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    ...type.title,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "600",
  },
});

const Stack = createNativeStackNavigator();

const linkingPrefixes = ["https://partogramme.com", "mypartogramme://"];

// Web keeps Profile / Admin / Dashboard as root stack screens (see
// NavBar.web.tsx). Native nests Profile and Dashboard inside MainTabs,
// which is mounted as Screen_Menu — those URLs have to be nested too
// or /profile and /dashboard never resolve on iOS/Android.
const linking = {
  prefixes: linkingPrefixes,
  config: {
    screens:
      Platform.OS === "web"
        ? {
            Screen_Login: "/login",
            Screen_Menu: "/menu",
            Screen_AddPartogramme: "/add_partogramme",
            Screen_Graph: "/graph",
            Screen_Profile: "/profile",
            Screen_Admin: "/admin",
            Screen_HospitalDashboard: "/dashboard",
          }
        : {
            Screen_Login: "login",
            Screen_Menu: {
              screens: {
                Screen_Menu: "menu",
                Screen_Profile: "profile",
                Screen_HospitalDashboard: "dashboard",
              },
            },
            Screen_AddPartogramme: "add_partogramme",
            Screen_Graph: "graph",
          },
  },
};

function App() {
  const [currentRouteName, setCurrentRouteName] = useState(undefined);
  const previousAppState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      logger.info(`App state: ${state}`);
      // Realtime's own reconnect logic only fires on a clean websocket
      // close/error — iOS/Android can silently suspend the socket on
      // background without ever firing that, so a phone locked for a while
      // and reopened needs its own explicit resync here.
      // Only "background" counts as a real suspension worth resyncing for —
      // "inactive" fires constantly on iOS for routine, momentary things
      // (an Alert.alert/toast, the keyboard, control center, the app-switcher
      // preview), none of which actually drop the connection. Treating those
      // the same as a genuine background/foreground cycle was firing a full
      // re-fetch + realtime-resubscribe on nearly every UI interaction.
      const wasBackground = previousAppState.current === "background";
      if (wasBackground && state === "active" && rootStore.profileStore.profile.id) {
        rootStore.partogrammeStore.resyncOnForeground();
      }
      previousAppState.current = state;
    });
    return () => sub.remove();
  }, []);

  const syncCurrentRoute = () =>
    setCurrentRouteName(navigationRef.getCurrentRoute()?.name);

  return (
    <Sentry.GlobalErrorBoundary fallback={ErrorFallback}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            onReady={syncCurrentRoute}
            onStateChange={syncCurrentRoute}
          >
            <NavBar currentRouteName={currentRouteName} />
            <AlertBanner />
            <OfflineBanner />
            <DialogTransferOutcome />
            <MaternityTransferRequestsPanel />
            <Stack.Navigator>
              <Stack.Screen
                name="Screen_Login"
                component={ScreenLogin}
                options={{
                  title: "Login",
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="Screen_Menu"
                // Native: Menu + Profile live inside a bottom tab bar
                // (MainTabs handles its own per-tab headers). Web keeps the
                // top NavBar instead, with Menu/Profile as plain screens.
                component={Platform.OS === "web" ? ScreenMenu : MainTabs}
                options={{
                  title: "Menu des Partogrammes",
                  headerTintColor: colors.accent,
                  headerTitleAlign: "center",
                  // The native back button here only exists when Login happens
                  // to still be in history, which a web page refresh wipes out
                  // (the stack is rebuilt from the URL alone). The web navbar's
                  // Connexion link is the reliable way back on web instead.
                  headerShown: Platform.OS === "web" ? !NAVBAR_ENABLED : false,
                }}
              />
              <Stack.Screen
                name="Screen_AddPartogramme"
                component={ScreenAddPartogramme}
                options={{
                  title: "Nouveau Partogramme",
                  headerTintColor: colors.accent,
                  headerTitleAlign: "center",
                  headerShown: !NAVBAR_ENABLED,
                }}
              />
              <Stack.Screen
                name="Screen_Graph"
                component={ScreenGraph}
                options={{
                  title: "Partogramme",
                  headerTintColor: colors.accent,
                  headerTitleAlign: "center",
                  headerShown: !NAVBAR_ENABLED,
                }}
              />
              {Platform.OS === "web" && (
                <Stack.Screen
                  name="Screen_Profile"
                  component={ScreenProfile}
                  options={{
                    title: "Mon profil",
                    headerTintColor: colors.accent,
                    headerTitleAlign: "center",
                    headerShown: !NAVBAR_ENABLED,
                  }}
                />
              )}
              {Platform.OS === "web" && (
                <Stack.Screen
                  name="Screen_Admin"
                  component={ScreenAdmin}
                  options={{
                    title: "Administration",
                    headerTintColor: colors.accent,
                    headerTitleAlign: "center",
                    headerShown: !NAVBAR_ENABLED,
                  }}
                />
              )}
              {Platform.OS === "web" && (
                <Stack.Screen
                  name="Screen_HospitalDashboard"
                  component={ScreenHospitalDashboard}
                  options={{
                    title: "Tableau de bord",
                    headerTintColor: colors.accent,
                    headerTitleAlign: "center",
                    headerShown: !NAVBAR_ENABLED,
                  }}
                />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
    </Sentry.GlobalErrorBoundary>
  );
}

export default Sentry.wrap(App);
