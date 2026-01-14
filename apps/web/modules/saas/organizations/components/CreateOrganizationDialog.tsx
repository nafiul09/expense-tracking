"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import {
	organizationListQueryKey,
	useCreateOrganizationMutation,
} from "@saas/organizations/lib/api";
import { Spinner } from "@shared/components/Spinner";
import { useRouter } from "@shared/hooks/router";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
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
import { ImageIcon, UploadIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CropImageDialog } from "../../settings/components/CropImageDialog";

const formSchema = z.object({
	name: z.string().min(3).max(32),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateOrganizationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultName?: string;
}

export function CreateOrganizationDialog({
	open,
	onOpenChange,
	defaultName,
}: CreateOrganizationDialogProps) {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { setActiveOrganization } = useActiveOrganization();
	const createOrganizationMutation = useCreateOrganizationMutation();
	const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
	const [cropDialogOpen, setCropDialogOpen] = useState(false);
	const [image, setImage] = useState<File | null>(null);
	const [uploadingLogo, setUploadingLogo] = useState(false);

	const getSignedUploadUrlMutation = useMutation(
		orpc.organizations.createLogoUploadUrl.mutationOptions(),
	);

	const MAX_FILE_SIZE = 1024 * 1024; // 1 MB in bytes

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
			name: defaultName ?? "",
		},
		mode: "onChange", // Enable real-time validation
	});

	const organizationName = form.watch("name");

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

	// Reset form and logo when dialog closes
	useEffect(() => {
		if (!open) {
			form.reset();
			setLogoBlob(null);
			setImage(null);
			setCropDialogOpen(false);
		}
	}, [open, form]);

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
					"Content-Type": logoBlob.type || "image/webp",
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
			// Don't throw - logo upload failure shouldn't prevent org creation
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

	const onSubmit = form.handleSubmit(async ({ name }) => {
		try {
			const newOrganization =
				await createOrganizationMutation.mutateAsync({
					name,
				});

			if (!newOrganization) {
				throw new Error("Failed to create organization");
			}

			// Upload logo if provided
			if (logoBlob && newOrganization.id) {
				await uploadLogo(newOrganization.id, logoBlob);
			}

			await setActiveOrganization(newOrganization.slug);

			await queryClient.invalidateQueries({
				queryKey: organizationListQueryKey,
			});

			form.reset();
			setLogoBlob(null);
			setImage(null);
			onOpenChange(false);
			router.replace(`/${newOrganization.slug}`);
		} catch {
			toast.error(t("organizations.createForm.notifications.error"));
		}
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{t("organizations.createForm.title")}
					</DialogTitle>
					<DialogDescription>
						{t("organizations.createForm.subtitle")}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						{/* Logo Upload */}
						<FormItem>
							<Label className="text-sm font-medium mb-2 block">
								{t("organizations.settings.logo.title")}
							</Label>
							<div className="flex items-center gap-4">
								<div
									{...getRootProps({
										className:
											"relative size-20 shrink-0 cursor-pointer rounded-lg border-2 border-dashed border-input bg-muted/30 transition-all hover:border-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
										tabIndex: -1, // Prevent auto-focus
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
										{t(
											"organizations.createForm.logo.formats",
										)}
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

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("organizations.createForm.name")}
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											placeholder={t(
												"organizations.createForm.name",
											)}
											autoComplete="organization"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									form.reset();
									setLogoBlob(null);
									setImage(null);
									onOpenChange(false);
								}}
							>
								{t("organizations.createForm.cancel")}
							</Button>
							<Button
								type="submit"
								disabled={
									!organizationName ||
									organizationName.length < 3 ||
									form.formState.isSubmitting ||
									uploadingLogo
								}
								loading={
									form.formState.isSubmitting || uploadingLogo
								}
							>
								{t("organizations.createForm.submit")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
				<CropImageDialog
					image={image}
					open={cropDialogOpen}
					onOpenChange={setCropDialogOpen}
					onCrop={onCrop}
				/>
			</DialogContent>
		</Dialog>
	);
}
