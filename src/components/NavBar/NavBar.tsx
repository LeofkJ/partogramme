// Native: no navbar — phones keep the regular stack headers.
// Web builds resolve NavBar.web.tsx instead (ARCHITECTURE.md §1).
export const NAVBAR_ENABLED = false;

export interface NavBarProps {
  currentRouteName?: string;
}

export const NavBar = (_props: NavBarProps) => null;
