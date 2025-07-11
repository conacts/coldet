/**
 * High-level workflow functions that combine database operations for common user journeys
 */

import type {
	AiUsageLog,
	Collector,
	Debtor,
	Organization,
	OrganizationInvitation,
	User,
	UserOrganizationMembership,
} from '@/lib/db/schema';
import { createAiUsageLog } from './ai-usage-logs';
import {
	type CreateCollectorParams,
	createCollector,
	getCollectorsByUserId,
} from './collectors';
import {
	bulkCreateDebtors,
	type CreateDebtorParams,
	getAccessibleDebtors,
} from './debtors';
import {
	createInvitation,
	getValidInvitation,
	useInvitation,
} from './invitations';
import {
	createMembership,
	getUserRoleInOrganization,
	isUserMemberOfOrganization,
} from './memberships';
import {
	type CreateOrganizationParams,
	createOrganization,
	getOrganizationById,
} from './organizations';
import { type CreateUserParams, createUser } from './users';

export interface SignupWithOrganizationParams {
	user: CreateUserParams;
	organization: CreateOrganizationParams;
}

export interface SignupWithOrganizationResult {
	user: User;
	organization: Organization;
	membership: UserOrganizationMembership;
}

/**
 * Complete user signup flow: Create user, create organization, make user admin
 */
export async function signupWithOrganization({
	user,
	organization,
}: SignupWithOrganizationParams): Promise<SignupWithOrganizationResult> {
	try {
		// Create user first
		const newUser = await createUser(user);

		// Create organization
		const newOrganization = await createOrganization(organization);

		// Make user admin of the organization
		const membership = await createMembership({
			userId: newUser.id,
			organizationId: newOrganization.id,
			role: 'admin',
		});

		return {
			user: newUser,
			organization: newOrganization,
			membership,
		};
	} catch (error) {
		console.error('Error in signup with organization flow', error);
		throw error;
	}
}

export interface InviteUserToOrganizationParams {
	organizationId: string;
	invitedByUserId: string;
	email: string;
	role?: string;
	expiresInDays?: number;
}

export interface InviteUserToOrganizationResult {
	invitation: OrganizationInvitation;
	magicUrl: string;
}

/**
 * Invite user to organization flow: Create invitation and return magic URL
 */
export async function inviteUserToOrganization({
	organizationId,
	invitedByUserId,
	email,
	role = 'collector',
	expiresInDays = 7,
}: InviteUserToOrganizationParams): Promise<InviteUserToOrganizationResult> {
	try {
		const invitation = await createInvitation({
			organizationId,
			invitedByUserId,
			email,
			role,
			expiresInDays,
		});

		const magicUrl = `https://app.coldets.com/invite/${invitation.token}`;

		return {
			invitation,
			magicUrl,
		};
	} catch (error) {
		throw error;
	}
}

export interface AcceptInvitationParams {
	token: string;
	user: CreateUserParams;
}

// These shouldn't be any, but the actual types
export interface AcceptInvitationResult {
	user: User;
	organization: Organization;
	membership: UserOrganizationMembership;
	invitation: OrganizationInvitation;
}

/**
 * Accept invitation flow: Validate invitation, create user, create membership
 */
export async function acceptInvitation({
	token,
	user,
}: AcceptInvitationParams): Promise<AcceptInvitationResult> {
	try {
		// Validate invitation
		const invitation = await getValidInvitation(token);
		if (!invitation) {
			throw new Error('Invalid or expired invitation');
		}

		// Create user
		const newUser = await createUser(user);

		// Create membership
		const membership = await createMembership({
			userId: newUser.id,
			organizationId: invitation.organizationId,
			role: invitation.role,
		});

		const organization = await getOrganizationById(invitation.organizationId);
		if (!organization) {
			throw new Error('Organization not found');
		}

		// Mark invitation as used
		await useInvitation(token, newUser.id);

		return {
			user: newUser,
			organization,
			membership,
			invitation,
		};
	} catch (error) {
		throw error;
	}
}

export interface JoinExistingUserToOrganizationParams {
	token: string;
	userId: string;
}

export interface JoinExistingUserToOrganizationResult {
	membership: UserOrganizationMembership;
	invitation: OrganizationInvitation;
}

/**
 * Join existing user to organization via invitation
 */
export async function joinExistingUserToOrganization({
	token,
	userId,
}: JoinExistingUserToOrganizationParams): Promise<JoinExistingUserToOrganizationResult> {
	try {
		// Validate invitation
		const invitation = await getValidInvitation(token);
		if (!invitation) {
			throw new Error('Invalid or expired invitation');
		}

		// Check if user is already a member
		const existingMembership = await isUserMemberOfOrganization(
			userId,
			invitation.organizationId
		);
		if (existingMembership) {
			throw new Error('User is already a member of this organization');
		}

		// Create membership
		const membership = await createMembership({
			userId,
			organizationId: invitation.organizationId,
			role: invitation.role,
		});

		// Mark invitation as used
		await useInvitation(token, userId);

		return {
			membership,
			invitation,
		};
	} catch (error) {
		throw error;
	}
}

export interface BulkUploadDebtorsParams {
	organizationId: string;
	userId: string;
	debtors: Omit<CreateDebtorParams, 'organizationId' | 'createdByUserId'>[];
	visibility?: 'private' | 'public';
}

export interface BulkUploadDebtorsResult {
	debtors: Debtor[];
	successCount: number;
	failureCount: number;
}

/**
 * Bulk upload debtors flow: Create multiple debtors with organization scoping
 */
export async function bulkUploadDebtors({
	organizationId,
	userId,
	debtors,
	visibility = 'private',
}: BulkUploadDebtorsParams): Promise<BulkUploadDebtorsResult> {
	try {
		const debtorParams = debtors.map((debtor) => ({
			organizationId,
			createdByUserId: userId,
			visibility,
			...debtor,
		}));

		const createdDebtors = await bulkCreateDebtors(debtorParams);

		return {
			debtors: createdDebtors,
			successCount: createdDebtors.length,
			failureCount: debtors.length - createdDebtors.length,
		};
	} catch (error) {
		throw error;
	}
}

export interface CreateCollectorForUserParams {
	organizationId: string;
	userId: string;
	collector: Omit<CreateCollectorParams, 'organizationId' | 'userId'>;
}

export interface CreateCollectorForUserResult {
	collector: Collector;
}

/**
 * Create collector for user flow: Create AI collector with organization scoping
 */
export async function createCollectorForUser({
	organizationId,
	userId,
	collector,
}: CreateCollectorForUserParams): Promise<CreateCollectorForUserResult> {
	try {
		const newCollector = await createCollector({
			organizationId,
			userId,
			...collector,
		});

		return {
			collector: newCollector,
		};
	} catch (error) {
		throw error;
	}
}

export interface GetUserDashboardDataParams {
	userId: string;
	organizationId: string;
}

export interface GetUserDashboardDataResult {
	userRole: string;
	accessibleDebtors: Debtor[];
	userCollectors: Collector[];
	organizationId: string;
	canCreateDebtors: boolean;
	canCreateCollectors: boolean;
	canInviteUsers: boolean;
}

/**
 * Get user dashboard data flow: Fetch all data needed for user dashboard
 */
export async function getUserDashboardData({
	userId,
	organizationId,
}: GetUserDashboardDataParams): Promise<GetUserDashboardDataResult> {
	try {
		// Get user role in organization
		const userRole = await getUserRoleInOrganization(userId, organizationId);
		if (!userRole) {
			throw new Error('User is not a member of this organization');
		}

		// Get accessible debtors based on role
		const accessibleDebtors = await getAccessibleDebtors(
			organizationId,
			userId,
			userRole
		);

		// Get user's collectors
		const userCollectors = await getCollectorsByUserId(organizationId, userId);

		// Determine permissions based on role
		const canCreateDebtors = true; // All users can create debtors
		const canCreateCollectors = true; // All users can create collectors
		const canInviteUsers = ['admin', 'manager'].includes(userRole);

		return {
			userRole,
			accessibleDebtors,
			userCollectors,
			organizationId,
			canCreateDebtors,
			canCreateCollectors,
			canInviteUsers,
		};
	} catch (error) {
		throw error;
	}
}

export interface LogAiUsageParams {
	organizationId: string;
	userId: string;
	collectorId?: string;
	usageType: string;
	model: string;
	promptTokens: number;
	completionTokens: number;
	metadata?: Record<string, unknown>;
}

export interface LogAiUsageResult {
	log: AiUsageLog;
	costCents: number;
}

/**
 * Log AI usage flow: Calculate cost and log usage for billing
 */
export async function logAiUsage({
	organizationId,
	userId,
	collectorId,
	usageType,
	model,
	promptTokens,
	completionTokens,
	metadata,
}: LogAiUsageParams): Promise<LogAiUsageResult> {
	try {
		const totalTokens = promptTokens + completionTokens;

		// Calculate cost based on model (simplified pricing)
		let costCents = 0;
		if (model.includes('gpt-4')) {
			costCents = Math.ceil(
				(promptTokens * 0.03 + completionTokens * 0.06) / 1000
			); // $0.03/$0.06 per 1k tokens
		} else if (model.includes('gpt-3.5')) {
			costCents = Math.ceil(
				(promptTokens * 0.0015 + completionTokens * 0.002) / 1000
			); // $0.0015/$0.002 per 1k tokens
		} else {
			costCents = Math.ceil((totalTokens * 0.001) / 1000); // Default pricing
		}

		const log = await createAiUsageLog({
			organizationId,
			userId,
			collectorId,
			usageType,
			model,
			promptTokens,
			completionTokens,
			totalTokens,
			costCents,
			metadata,
		});

		return {
			log,
			costCents,
		};
	} catch (error) {
		throw error;
	}
}

export interface SimulateEmailGenerationParams {
	organizationId: string;
	userId: string;
	collectorId: string;
	debtorId: string;
	emailContent: string;
	model?: string;
}

export interface SimulateEmailGenerationResult {
	email: {
		id: string;
		content: string;
		aiGenerated: boolean;
		collectorId: string;
	};
	aiUsageLog: any;
}

/**
 * Simulate email generation flow: Generate email and log AI usage
 */
export async function simulateEmailGeneration({
	organizationId,
	userId,
	collectorId,
	debtorId,
	emailContent,
	model = 'gpt-4o-mini',
}: SimulateEmailGenerationParams): Promise<SimulateEmailGenerationResult> {
	try {
		// Simulate email generation (in real app, this would call OpenAI API)
		const email = {
			id: `email_${Date.now()}`,
			content: emailContent,
			aiGenerated: true,
			collectorId,
		};

		// Log AI usage
		const promptTokens = Math.ceil(emailContent.length / 4); // Rough estimate
		const completionTokens = Math.ceil(emailContent.length / 4);

		const aiUsageResult = await logAiUsage({
			organizationId,
			userId,
			collectorId,
			usageType: 'email_generation',
			model,
			promptTokens,
			completionTokens,
			metadata: {
				debtorId,
				emailId: email.id,
				contentLength: emailContent.length,
			},
		});

		return {
			email,
			aiUsageLog: aiUsageResult.log,
		};
	} catch (error) {
		throw error;
	}
}
