import { auth } from "@repo/auth";
import {
	createUser,
	createUserAccount,
	getUserByEmail,
	db,
	getOrganizationBySlug,
} from "@repo/database";
import { logger } from "@repo/logs";
import { nanoid, customAlphabet } from "nanoid";

// Custom alphabet for slug generation (same as in generate-organization-slug.ts)
const ALPHANUMERIC_ALPHABET =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const generateSlug = customAlphabet(ALPHANUMERIC_ALPHABET, 8);

async function generateUniqueSlug(): Promise<string> {
	const MAX_RETRIES = 10;
	for (let i = 0; i < MAX_RETRIES; i++) {
		const slug = generateSlug();
		const existing = await getOrganizationBySlug(slug);
		if (!existing) {
			return slug;
		}
	}
	throw new Error("Failed to generate unique slug");
}

async function main() {
	logger.info("Let's create a new user for your application!");

	const email = await logger.prompt("Enter an email:", {
		required: true,
		placeholder: "admin@example.com",
		type: "text",
	});

	const name = await logger.prompt("Enter a name:", {
		required: true,
		placeholder: "Adam Admin",
		type: "text",
	});

	const isAdmin = await logger.prompt("Should user be an admin?", {
		required: true,
		type: "confirm",
		default: false,
	});

	const authContext = await auth.$context;
	const adminPassword = nanoid(16);
	const hashedPassword = await authContext.password.hash(adminPassword);

	// check if user exists
	const user = await getUserByEmail(email);

	if (user) {
		logger.error("User with this email already exists!");
		return;
	}

	const adminUser = await createUser({
		email,
		name,
		role: isAdmin ? "admin" : "user",
		emailVerified: true,
		onboardingComplete: true,
	});

	if (!adminUser) {
		logger.error("Failed to create user!");
		return;
	}

	await createUserAccount({
		userId: adminUser.id,
		providerId: "credential",
		accountId: adminUser.id,
		hashedPassword,
	});

	// Create default workspace for the user
	const workspaceName = `${name}'s Workspace`;
	const slug = await generateUniqueSlug();

	const workspace = await db.organization.create({
		data: {
			name: workspaceName,
			slug,
			createdAt: new Date(),
		},
	});

	// Add user as owner of the workspace
	await db.member.create({
		data: {
			organizationId: workspace.id,
			userId: adminUser.id,
			role: "owner",
			createdAt: new Date(),
		},
	});

	logger.success("User created successfully!");
	logger.success(`Workspace "${workspaceName}" created successfully!`);
	logger.info(`Here is the password for the new user: ${adminPassword}`);
}

main();
