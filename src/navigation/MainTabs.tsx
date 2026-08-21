// Mobile-only bottom tab bar (Menu / + / Profil) — web keeps using the top
// navbar instead (NavBar.web.tsx), see App.js.
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { observer } from "mobx-react";
import { ScreenMenu } from "../screens/Menu/Menu";
import { ScreenProfile } from "../screens/Profile/Profile";
import { ScreenHospitalDashboard } from "../screens/HospitalDashboard/HospitalDashboard";
import { IconHome, IconUser, IconPlus, IconLayoutDashboard } from "../components/Icons";
import { rootStore } from "../store/rootStore";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

// Never actually rendered — the "+" tab's press is intercepted below to
// navigate to Screen_AddPartogramme instead of switching to this tab.
const AddPartogrammeActionPlaceholder = () => null;

export const MainTabs = observer(() => {
  const isNurse = rootStore.userInfoStore.userInfo.role === "NURSE";
  const isDoctor = rootStore.userInfoStore.userInfo.role === "DOCTOR";
  const isMaternityNurse = isNurse && rootStore.userInfoStore.userInfo.nurseType === "MATERNITY";
  // Dashboard is shared by every doctor and hospital nurse (see task.md) —
  // not maternity nurses, whose own patient list already shows everything
  // at her maternity permanently.
  const isHospitalStaff = isDoctor || (isNurse && !isMaternityNurse);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Screen_Menu"
        component={ScreenMenu}
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => <IconHome size={size} color={color} />,
        }}
      />
      {isMaternityNurse && (
        <Tab.Screen
          name="AddPartogrammeAction"
          component={AddPartogrammeActionPlaceholder}
          options={{
            title: "Ajouter",
            tabBarIcon: ({ color, size }) => <IconPlus size={size} color={color} />,
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("Screen_AddPartogramme");
            },
          })}
        />
      )}
      {isHospitalStaff && (
        <Tab.Screen
          name="Screen_HospitalDashboard"
          component={ScreenHospitalDashboard}
          options={{
            title: "Tableau de bord",
            tabBarIcon: ({ color, size }) => <IconLayoutDashboard size={size} color={color} />,
            headerShown: true,
            headerTitle: "Tableau de bord",
            headerTintColor: colors.accent,
            headerTitleAlign: "center",
          }}
        />
      )}
      <Tab.Screen
        name="Screen_Profile"
        component={ScreenProfile}
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <IconUser size={size} color={color} />,
          // Menu already renders its own header (name/role/gear), Profile
          // doesn't have one of its own, so it needs the tab navigator's.
          headerShown: true,
          headerTitle: "Mon profil",
          headerTintColor: colors.accent,
          headerTitleAlign: "center",
        }}
      />
    </Tab.Navigator>
  );
});

export default MainTabs;
