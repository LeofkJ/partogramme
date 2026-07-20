import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { NavBar, NAVBAR_ENABLED } from "./src/components/NavBar/NavBar";
import { navigationRef } from "./src/navigationRef";
import { colors, radius } from "./src/theme";
import * as Sentry from "./src/lib/sentry";
import { logger } from "./src/lib/logger";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { ScreenLogin } from "./src/screens/Login/Login";
import { ScreenRegister } from "./src/screens/Register/register";
import { ScreenMenu } from "./src/screens/Menu/Menu";
import { ScreenAddPartogramme } from "./src/screens/AddPartogramme/AddPartogramme";
import { ScreenGraph } from "./src/screens/Graph/Graph";

// react-native-paper-dates (the date/time pickers) renders through
// react-native-paper components, which default to Paper's stock purple
// theme without a Provider — this keeps them on the app's actual palette.
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

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ["https://partogramme.com", "mypartogramme://"],
  config: {
    screens: {
      Screen_Login: "/login",
      Screen_Register: "/register",
      Screen_Menu: "/menu",
      Screen_AddPartogramme: "/add_partogramme",
      Screen_Graph: "/graph",
    },
  },
};

function App() {
  const [currentRouteName, setCurrentRouteName] = useState(undefined);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      logger.info(`App state: ${state}`);
    });
    return () => sub.remove();
  }, []);

  const syncCurrentRoute = () =>
    setCurrentRouteName(navigationRef.getCurrentRoute()?.name);

  return (
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
                name="Screen_Register"
                component={ScreenRegister}
                options={{
                  title: "Créer un compte",
                  headerTintColor: colors.accent,
                  headerTitleAlign: "center",
                  // The web navbar covers navigation on logged-out screens.
                  headerShown: !NAVBAR_ENABLED,
                }}
              />
              <Stack.Screen
                name="Screen_Menu"
                component={ScreenMenu}
                options={{
                  title: "Menu des Partogrammes",
                  headerTintColor: colors.accent,
                  headerTitleAlign: "center",
                  // The native back button here only exists when Login happens
                  // to still be in history, which a web page refresh wipes out
                  // (the stack is rebuilt from the URL alone). The web navbar's
                  // Connexion link is the reliable way back on web instead.
                  headerShown: !NAVBAR_ENABLED,
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
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(App);
