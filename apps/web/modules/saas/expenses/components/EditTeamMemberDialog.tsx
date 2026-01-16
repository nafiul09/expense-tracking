"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { expensesApi } from "@saas/expenses/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Textarea } from "@ui/components/textarea";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
	name: z.string().min(1).max(255),
	email: z.string().email().optional().or(z.literal("")),
	position: z.string().optional(),
	joinedDate: z.coerce.date().optional(),
	salary: z.number().nonnegative().optional(),
	status: z.enum(["active", "inactive"]).default("active"),
	notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTeamMemberDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	memberId: string;
	businessId: string;
}

export function EditTeamMemberDialog({
	open,
	onOpenChange,
	memberId,
	businessId,
}: EditTeamMemberDialogProps) {
	const t = useTranslations();
	const queryClient = useQueryClient();

	const { data: member, isLoading } = useQuery({
		queryKey: ["teamMember", memberId],
		queryFn: () => expensesApi.teamMembers.getDetails(memberId),
		enabled: !!memberId && open,
	});

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: {
			name: "",
			email: "",
			position: "",
			joinedDate: undefined,
			salary: undefined,
			status: "active",
			notes: "",
		},
	});

	useEffect(() => {
		if (member) {
			// Get the account-specific data for this business
			const accountData = member.accounts?.find(
				(acc) => acc.accountId === businessId,
			);

			form.reset({
				name: member.name,
				email: member.email || "",
				position: accountData?.position || member.position || "",
				joinedDate: accountData?.joinedDate
					? new Date(accountData.joinedDate)
					: member.joinedDate
						? new Date(member.joinedDate)
						: undefined,
				salary: accountData?.salary
					? Number(accountData.salary)
					: member.salary
						? Number(member.salary)
						: undefined,
				status: (member.status as "active" | "inactive") || "active",
				notes: member.notes || "",
			});
		}
	}, [member, businessId, form]);

	const onSubmit = async (values: FormValues) => {
		try {
			await expensesApi.teamMembers.update({
				id: memberId,
				name: values.name,
				email: values.email || undefined,
				position: values.position || undefined,
				joinedDate: values.joinedDate || undefined,
				salary: values.salary || undefined,
				status: values.status,
				notes: values.notes || undefined,
			});

			toast.success(
				t("expenses.teamMembers.updated") ||
					"Team member updated successfully",
			);
			queryClient.invalidateQueries({
				queryKey: ["teamMembers", businessId],
			});
			queryClient.invalidateQueries({
				queryKey: ["teamMember", memberId],
			});
			onOpenChange(false);
		} catch (error) {
			toast.error(
				t("expenses.teamMembers.updateError") ||
					"Failed to update team member",
			);
			console.error(error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{t("expenses.teamMembers.edit") || "Edit Team Member"}
					</DialogTitle>
					<DialogDescription>
						{t("expenses.teamMembers.editDescription") ||
							"Update team member information"}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="text-center py-8">
						{t("common.loading")}
					</div>
				) : (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-4"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.teamMembers.form.name",
											)}
										</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t(
													"expenses.teamMembers.form.email",
												)}
											</FormLabel>
											<FormControl>
												<Input
													type="email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="position"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t(
													"expenses.teamMembers.form.position",
												)}
											</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="joinedDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t(
													"expenses.teamMembers.form.joinedDate",
												)}
											</FormLabel>
											<FormControl>
												<Input
													type="date"
													value={
														field.value
															? new Date(
																	field.value,
																)
																	.toISOString()
																	.split(
																		"T",
																	)[0]
															: ""
													}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? new Date(
																		e.target
																			.value,
																	)
																: undefined,
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="salary"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t(
													"expenses.teamMembers.form.salary",
												)}
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													value={field.value ?? ""}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? Number.parseFloat(
																		e.target
																			.value,
																	)
																: undefined,
														)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.teamMembers.form.status",
											)}
										</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
											value={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="active">
													{t(
														"expenses.teamMembers.status.active",
													)}
												</SelectItem>
												<SelectItem value="inactive">
													{t(
														"expenses.teamMembers.status.inactive",
													)}
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="notes"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t(
												"expenses.teamMembers.form.notes",
											)}
										</FormLabel>
										<FormControl>
											<Textarea {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
								>
									{t("common.cancel")}
								</Button>
								<Button type="submit">
									{t("common.save") || "Save"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	);
}
