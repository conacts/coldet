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