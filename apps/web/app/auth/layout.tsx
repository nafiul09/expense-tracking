import { AuthWrapper } from "@saas/shared/components/AuthWrapper";
import type { PropsWithChildren } from "react";

export default function AuthLayout({ children }: PropsWithChildren) {
	return <AuthWrapper>{children}</AuthWrapper>;
}
