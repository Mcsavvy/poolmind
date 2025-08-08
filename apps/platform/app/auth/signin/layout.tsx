import { ReactNode } from "react";
import { Suspense } from "react";
import FullPageLoader from "@/components/ui/full-page-loader";

export const metadata = {
  title: "Sign in | PoolMind",
  description: "Sign in to your PoolMind account",
};


export default function SignInLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<FullPageLoader text="Loading..." />}>
      {children}
    </Suspense>
  );
}