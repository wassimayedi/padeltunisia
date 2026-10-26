import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

/**
 * Dev-only TanStack Devtools: router panel (open with Ctrl+~ or the floating button) and the
 * source inspector (hold Shift+Alt+Cmd/Ctrl, click an element to open its code in the editor).
 */
export default function Devtools() {
  return <TanStackDevtools plugins={[{ name: "Router", render: <TanStackRouterDevtoolsPanel /> }]} />;
}
