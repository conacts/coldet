// SNS Notification wrapper for all SES events
export interface SnsNotification {
	Type: string;
	MessageId: string;
	TopicArn: string;
	Subject: string;
	Message: string; // JSON stringified SES message
	Timestamp: string;
	SignatureVersion: string;
	Signature: string;
	SigningCertURL: string;
	UnsubscribeURL: string;
}

// Base mail object shared across all SES events
export interface SesMailObject {
	timestamp: string;
	source: string;
	sendingAccountId?: string;
	messageId: string;
	destination: string[];
	headersTruncated?: boolean;
	commonHeadersTruncated?: boolean;
	headers: Array<{ name: string; value: string }>;
	commonHeaders: {
		returnPath?: string;
		from: string[];
		replyTo?: string[];
		date?: string;
		to: string[];
		messageId: string;
		subject: string;
	};
	tags?: Record<string, string[]>;
}

// Specific event types
export interface SesOpenEvent {
	timestamp: string;
	userAgent: string;
	ipAddress: string;
}

export interface SesClickEvent {
	timestamp: string;
	userAgent: string;
	ipAddress: string;
	link: string;
	linkTags: Record<string, string[]>;
}

export interface SesBounceEvent {
	timestamp: string;
	feedbackId: string;
	bounceType: string;
	bounceSubType: string;
	bouncedRecipients: Array<{
		emailAddress: string;
		action?: string;
		status?: string;
		diagnosticCode?: string;
	}>;
}

export interface SesComplaintEvent {
	timestamp: string;
	feedbackId: string;
	userAgent?: string;
	complaintSubType?: string;
	complainedRecipients: Array<{
		emailAddress: string;
	}>;
}

export interface SesDeliveryEvent {
	timestamp: string;
	processingTimeMillis: number;
	recipients: string[];
	smtpResponse: string;
}

// Union type for all SES message events (outbound tracking)
export interface SesMessage {
	eventType: 'Open' | 'Click' | 'Bounce' | 'Complaint' | 'Delivery' | 'Send';
	mail: SesMailObject;
	open?: SesOpenEvent;
	click?: SesClickEvent;
	bounce?: SesBounceEvent;
	complaint?: SesComplaintEvent;
	delivery?: SesDeliveryEvent;
}

// Specific interface for inbound email notifications (SES receipt)
export interface SesSnsNotification {
	notificationType: "Received";
	mail: {
		timestamp: string;
		source: string;
		messageId: string;
		destination: string[];
		headersTruncated?: boolean;
		commonHeadersTruncated?: boolean;
		headers: Array<{ name: string; value: string }>;
		commonHeaders: {
			returnPath: string;
			from: string[];
			date: string;
			to: string[];
			messageId: string;
			subject: string;
		};
	};
	receipt: {
		timestamp: string;
		recipients: string[];
		action: {
			type: "SNS";
			topicArn: string;
			encoding: string;
			payloadType: string;
		};
		processingTimeMillis: number;
		spamVerdict: { status: string };
		virusVerdict: { status: string };
		spfVerdict: { status: string };
		dkimVerdict: { status: string };
		dmarcVerdict: { status: string };
	};
	content?: string; // Raw email content (if included)
}