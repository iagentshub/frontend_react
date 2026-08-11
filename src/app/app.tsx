import { RouterProvider } from "react-router-dom";
import { PublicMotionProvider } from "@/components/public-motion";
import { router } from "./router";

export function App() {
  return (
    <PublicMotionProvider>
      <RouterProvider router={router} />
    </PublicMotionProvider>
  );
}
