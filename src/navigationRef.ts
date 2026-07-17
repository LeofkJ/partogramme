import { createNavigationContainerRef } from "@react-navigation/native";

// Module-level navigation handle so chrome living outside the navigator
// (e.g. the web NavBar) can navigate.
export const navigationRef = createNavigationContainerRef();

export function navigate(name: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as never);
  }
}

// Used for auth transitions (e.g. logout): replaces the whole stack so the
// user can't navigate/swipe back into the signed-out screens.
export function reset(name: string) {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: name as never }] });
  }
}
