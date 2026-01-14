"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { useCreateOrganizationMutation } from "@saas/organizations/lib/api";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { Spinner } from "@shared/components/Spinner";
import { orpc } from "@shared/lib/orpc-query-utils";
import { Button } from "@ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon, ImageIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CropImageDialog } from "../../settings/components/CropImageDialog";

const formSchema = z.object({
	workspaceName: z.string().min(3).max(32),
});

type FormValues = z.infer<typeof formSchema>;

export function OnboardingStep1({ onCompleted }: { onCompleted: () => void }) {
	const t = useTranslations();
	const { setActiveOrganization } = useActiveOrganization();
	const createOrganizationMutation = useCreateOrganizationMutation();
	const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
	const [cropDialogOpen, setCropDialogOpen] = useState(false);
	const [image, setImage] = useState<File | null>(null);
	const [uploadingLogo, setUploadingLogo] = useState(false);

	const getSignedUploadUrlMutation = useMutation(
		orpc.organizations.createLogoUploadUrl.mutationOptions(),
	);

	const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop: (acceptedFiles, rejectedFiles) => {
			if (rejectedFiles.length > 0) {
				const rejection = rejectedFiles[0];
				if (rejection.errors.some((e) => e.code === "file-too-large")) {
					toast.error(
						t(
							"organizations.createForm.logo.uploadErrors.fileTooLarge",
						),
					);
				} else if (
					rejection.errors.some((e) => e.code === "file-invalid-type")
				) {
					toast.error(
						t(
							"organizations.createForm.logo.uploadErrors.invalidType",
						),
					);
				} else {
					toast.error(
						t(
							"organizations.createForm.logo.uploadErrors.uploadFailed",
						),
					);
				}
				return;
			}

			if (acceptedFiles.length > 0) {
				setImage(acceptedFiles[0]);
				setCropDialogOpen(true);
			}
		},
		accept: {
			"image/png": [".png"],
			"image/jpeg": [".jpg", ".jpeg"],
			"image/webp": [".webp"],
		},
		maxSize: MAX_FILE_SIZE,
		multiple: false,
		noClick: false,
		noKeyboard: false,
	});

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			workspaceName: "",
		},
		mode: "onChange",
	});

	const workspaceName = form.watch("workspaceName");

	// Create object URL for logo preview
	const logoPreviewUrl = useMemo(() => {
		if (logoBlob) {
			return URL.createObjectURL(logoBlob);
		}
		return null;
	}, [logoBlob]);

	// Cleanup object URL on unmount or when logo changes
	useEffect(() => {
		return () => {
			if (logoPreviewUrl) {
				URL.revokeObjectURL(logoPreviewUrl);
			}
		};
	}, [logoPreviewUrl]);

	const uploadLogo = async (organizationId: string, logoBlob: Blob) => {
		setUploadingLogo(true);
		try {
			const { signedUploadUrl, path } =
				await getSignedUploadUrlMutation.mutateAsync({
					organizationId,
				});

			const response = await fetch(signedUploadUrl, {
				method: "PUT",
				body: logoBlob,
				headers: {
					"Content-Type": "image/png",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to upload logo");
			}

			const { error } = await authClient.organization.update({
				organizationId,
				data: {
					logo: path,
				},
			});

			if (error) {
				throw error;
			}
		} catch (error) {
			console.error("Failed to upload logo:", error);
			// Don't throw - logo upload failure shouldn't prevent workspace creation
		} finally {
			setUploadingLogo(false);
		}
	};

	const onCrop = async (croppedImageData: Blob | null) => {
		if (!croppedImageData) {
			return;
		}
		setLogoBlob(croppedImageData);
		setCropDialogOpen(false);
		setImage(null);
	};

	const onSubmit: SubmitHandler<FormValues> = async ({ workspaceName }) => {
		form.clearErrors("root");

		try {
			// Create workspace
			const newOrganization =
				await createOrganizationMutation.mutateAsync({
					name: workspaceName,
				});

			if (!newOrganization) {
				throw new Error("Failed to create workspace");
			}

			// Upload logo if provided
			if (logoBlob && newOrganization.id) {
				await uploadLogo(newOrganization.id, logoBlob);
			}

			// Set as active workspace
			await setActiveOrganization(newOrganization.slug);

			// Mark onboarding complete
			await authClient.updateUser({
				onboardingComplete: true,
			});

			onCompleted();
		} catch {
			form.setError("root", {
				type: "server",
				message: t("onboarding.notifications.accountSetupFailed"),
			});
		}
	};

	return (
		<div>
			<Form {...form}>
				<form
					className="flex flex-col items-stretch gap-6"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					{/* Workspace Logo Upload */}
					<FormItem>
						<Label className="text-sm font-medium mb-2 block">
							{t("organizations.settings.logo.title")}
						</Label>
						<div className="flex items-center gap-4">
							<div
								{...getRootProps({
									className:
										"relative size-20 shrink-0 cursor-pointer rounded-lg border-2 border-dashed border-input bg-muted/30 transition-all hover:border-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									tabIndex: -1,
								})}
							>
								<input
									{...getInputProps()}
									id="logo-upload"
									tabIndex={-1}
									aria-label={t(
										"organizations.createForm.logo.ariaLabel",
									)}
								/>
								{logoPreviewUrl ? (
									<>
										<Image
											src={logoPreviewUrl}
											alt={t(
												"organizations.settings.logo.title",
											)}
											className="rounded-lg object-cover"
											fill
											unoptimized
										/>
										<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity hover:opacity-100">
											<UploadIcon className="size-5 text-white" />
										</div>
									</>
								) : (
									<div className="flex h-full flex-col items-center justify-center gap-1.5 p-2">
										<ImageIcon className="size-7 text-muted-foreground" />
										<span className="text-muted-foreground text-xs font-medium">
											{isDragActive
												? t(
														"organizations.createForm.logo.dropHere",
													)
												: t(
														"organizations.createForm.logo.upload",
													)}
										</span>
									</div>
								)}
								{uploadingLogo && (
									<div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/90 backdrop-blur-sm">
										<Spinner className="size-4" />
									</div>
								)}
								{isDragActive && !logoPreviewUrl && (
									<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/20 border-2 border-primary">
										<span className="text-xs font-semibold text-primary">
											{t(
												"organizations.createForm.logo.dropHere",
											)}
										</span>
									</div>
								)}
							</div>
							<div className="flex-1 space-y-1.5">
								<p className="text-muted-foreground text-sm leading-relaxed">
									{t(
										"organizations.createForm.logo.description",
									)}
								</p>
								<p className="text-muted-foreground text-xs">
									{t("organizations.createForm.logo.formats")}
								</p>
								{logoBlob && (
									<Button
										type="button"
										variant="destructive"
										size="sm"
										className="h-7 px-2 text-xs"
										onClick={(e) => {
											e.stopPropagation();
											setLogoBlob(null);
											setImage(null);
										}}
									>
										{t(
											"organizations.createForm.logo.remove",
										)}
									</Button>
								)}
							</div>
						</div>
					</FormItem>

					{/* Workspace Name */}
					<FormField
						control={form.control}
						name="workspaceName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{t("onboarding.workspaceName")}
									<span className="text-destructive ml-1">
										*
									</span>
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder={t(
											"onboarding.workspaceNamePlaceholder",
										)}
										autoComplete="organization"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button
						type="submit"
						disabled={
							!workspaceName ||
							workspaceName.length < 3 ||
							form.formState.isSubmitting ||
							uploadingLogo
						}
						loading={
							form.formState.isSubmitting ||
							createOrganizationMutation.isPending ||
							uploadingLogo
						}
					>
						{t("onboarding.continue")}
						<ArrowRightIcon className="ml-2 size-4" />
					</Button>
				</form>
			</Form>
			<CropImageDialog
				image={image}
				open={cropDialogOpen}
				onOpenChange={setCropDialogOpen}
				onCrop={onCrop}
			/>
		</div>
	);
}
