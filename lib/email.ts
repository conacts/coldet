import { render } from '@react-email/render';
import { EmailResponseEmail } from '@/emails/email-response';
import { sendEmail } from '@/lib/aws/ses';
import { getDebtByDebtorId, getDebtsByDebtorEmail } from '@/lib/db/debts';
import {
	createEmailThread,
	getEmailsByThreadId,
	getThreadByMessageId,
} from '@/lib/db/email-threads';
import { createEmail } from '@/lib/db/emails';
import type { Debt, Email, EmailThread } from '@/lib/db/schema';
import type { EmailResponse } from '@/lib/llms';
import { generateResponseEmail } from '@/lib/llms';
import { extractMessageIdFromEmailHeader } from '@/lib/utils';
import type { SesSnsNotification } from '@/types/aws-ses';

const WHITESPACE_REGEX = /\s+/;

export interface SendEmailResponseParams {
	to: string;
	emailResponse: EmailResponse;
	thread: EmailThread;
	debt: Debt;
	replyToMessageId?: string;
	emailHistory?: Email[];
}

export async function handleReceivedEmail(
	notification: SesSnsNotification,
): Promise<void> {
	const sender = parseInboundEmailSender(notification.mail);
	const { thread, emails: emailHistory, replyToMessageId } = await findOrCreateEmailThread(
		notification,
		sender
	);

	const debtAccount = await getDebtByDebtorId(thread.debtorId);

	if (!debtAccount) {
		throw new Error('BAD ERROR: No debt account found for debtor');
	}

	const debtId = debtAccount.id;
	const threadId = thread.id;
	const subject = notification.mail.commonHeaders.subject;
	const content = parseInboundEmailContent(notification.content);
	const inboundMessageId = notification.mail.messageId;

	const inboundEmail = await createEmail({
		debtId,
		threadId,
		direction: 'inbound',
		messageId: inboundMessageId,
		subject,
		replyTo: replyToMessageId,
		content,
	});

	// Generate AI response
	const emailResponse = await generateResponseEmail(emailHistory, debtAccount);

	// Send email response back to the debtor
	await sendEmailResponse({
		to: sender,
		emailResponse,
		thread,
		debt: debtAccount,
		replyToMessageId: inboundEmail.messageId,
		emailHistory,
	});
}

/*
HEADERS:

[
  {
	name: 'Received-SPF',
	value: 'pass (spfCheck: domain of _spf.google.com designates 209.85.166.48 as permitted sender) client-ip=209.85.166.48; envelope-from=csheehan630@gmail.com; helo=mail-io1-f48.google.com;'
  },
  {
	name: 'Authentication-Results',
	value: 'amazonses.com;\r\n' +
	  ' spf=pass (spfCheck: domain of _spf.google.com designates 209.85.166.48 as permitted sender) client-ip=209.85.166.48; envelope-from=csheehan630@gmail.com; helo=mail-io1-f48.google.com;\r\n' +
	  ' dkim=pass header.i=@gmail.com;\r\n' +
	  ' dmarc=pass header.from=gmail.com;'
  },
  { name: 'Return-Path', value: '<csheehan630@gmail.com>' },
  {
	name: 'Received',
	value: 'from mail-io1-f48.google.com (mail-io1-f48.google.com [209.85.166.48])\r\n' +
	  ' by open.mail-manager-smtp.us-east-2.amazonaws.com with ESMTPS id i96v0slmqobd69l5es724hjqh9ls18qog305oog1\r\n' +
	  ' (version=TLSv1.3 cipher=TLS_AES_256_GCM_SHA384)\r\n' +
	  ' for <chris@coldets.com>; Tue, 08 Jul 2025 22:38:29 +0000 (UTC)'
  },
  {
	name: 'Received',
	value: 'by mail-io1-f48.google.com with SMTP id ca18e2360f4ac-86cdb330b48so453138739f.0\r\n' +
	  '        for <chris@coldets.com>; Tue, 08 Jul 2025 15:38:29 -0700 (PDT)'
  },
  {
	name: 'DKIM-Signature',
	value: 'v=1; a=rsa-sha256; c=relaxed/relaxed;\r\n' +
	  '        d=gmail.com; s=20230601; t=1752014308; x=1752619108; darn=coldets.com;\r\n' +
	  '        h=message-id:in-reply-to:to:references:date:subject:mime-version:from\r\n' +
	  '         :from:to:cc:subject:date:message-id:reply-to;\r\n' +
	  '        bh=8ToaLYpG4yhkCxNfPRQioH1TF5PFCDkcVNnuscNeRoA=;\r\n' +
	  '        b=D8Y9tMH+Ate5EX6FoH4KAbHfzDCbfu5nn8jypyqrbrCPKVZyS0HdBKonhAZZuC3INK\r\n' +
	  '         JnjCyPQDX7uyAgrBsVQ0/fc+r4itO4x2oS8x6QR9pwEzDaxXHdbXKlFSzGyV+XfbKn2E\r\n' +
	  '         M5JnF2t45DaUVyZ2ckn692XYRbNpUGn68XGBztU4zcnRtD848S9WlDq6ORcqQQU0IoJ1\r\n' +
	  '         EPCC0/1U43jx7baAh6DMUNDXwxHgOGF05WuqHvzife3bKVOpja4YaQsnwz9YorKBob4K\r\n' +
	  '         CEGxJ6P7TtaylRC7CTNogNDwHXtsBCc8aKbfvx7B+86VdFwmZVOzN2NU1YE+cS2mgoWY\r\n' +
	  '         Xt1A=='
  },
  {
	name: 'X-Google-DKIM-Signature',
	value: 'v=1; a=rsa-sha256; c=relaxed/relaxed;\r\n' +
	  '        d=1e100.net; s=20230601; t=1752014308; x=1752619108;\r\n' +
	  '        h=message-id:in-reply-to:to:references:date:subject:mime-version:from\r\n' +
	  '         :x-gm-message-state:from:to:cc:subject:date:message-id:reply-to;\r\n' +
	  '        bh=8ToaLYpG4yhkCxNfPRQioH1TF5PFCDkcVNnuscNeRoA=;\r\n' +
	  '        b=KyPIjfsEpjEzfDb5XmRk3cZRDdJDX08D1fbzCk7rReFAsdx0dNt7wx0oSW8jvwSDpP\r\n' +
	  '         uuKh1cAEu1fNZIAJOWHBE9AyDZmbS2yt0omuG55iUaoXQW9QLxMsluPBv5mTKkI2EG5g\r\n' +
	  '         6SgTYlB1OXRyExleNp5dr0wcFik+qxzVgmmauMeYtBijfLp8U8PSqmqwBLsJ6QiPfqIa\r\n' +
	  '         R7m69CQv3OlAetZ9TTodMb2X0MIOGvk89/5AuCaxEmEAy4W6CjcBIG7dnLMb3QLrssb3\r\n' +
	  '         rRGVMl8jtog53xoz56v5mQUn0LjG7mKybybS+dcysCyvcixYBh+elhl31KPiOyf/HsAX\r\n' +
	  '         ZMaA=='
  },
  {
	name: 'X-Gm-Message-State',
	value: 'AOJu0YyUIsylvDMH7t4X12W2xxrfIz/ePyIuDYkZOgfAvhgVbdrx3cfM\r\n' +
	  '\tjURpGkRdwO55DCg0ZG+EnLoWkMSk/AurVUG7GGhUQOiSS97glz+MBNcyTt3JJNTX'
  },
  {
	name: 'X-Gm-Gg',
	value: 'ASbGnct6VobKuVpI2Vn8Ix3S+8UTa6i0GjSzaDCv25FPko5PLTry6z64FwHlyHFV89L\r\n' +
	  '\tF2SpTWB035FU+loondzar6SisU+Z8cK54SKh44wYM4fadeRSHjGY9qqWnNSCQjdK/B0S+EOZR+u\r\n' +
	  '\tA5BP1Zvm9UOs1or6kONTsBzNwAPuRT/inX9qXTD90nTFkoYgQXycmJGoXVsX3S15yJ5O7+2tVpy\r\n' +
	  '\tc0jQRSu9hPfoeypvtnmz+jq/ATxtUreFdHuj2B1MWCUr6+rwAKglUXM6sWCPoW+ZGsYh6nHHtl6\r\n' +
	  '\tBJEbUaZlH+W+ENwpJRte8pw3pMFX9fdXFDHkFmFF1O9lxwmb4tYr63k0Ly1FM1o1jZnCbv6CzC9\r\n' +
	  '\tAxerCUee9Tz2yz+eC9CumHTvwVCENcUmqlWOQHMqf'
  },
  {
	name: 'X-Google-Smtp-Source',
	value: 'AGHT+IFJBxj1wu2J8P7W5D6p6EZeeKLtpspDW2GecrQ8q2I1Z/vdZHDjNMvGoTbYyR2yGAaB82/eRA=='
  },
  {
	name: 'X-Received',
	value: 'by 2002:a05:6602:6416:b0:86c:ec82:c7d7 with SMTP id ca18e2360f4ac-8795b086415mr54946339f.1.1752014308412;\r\n' +
	  '        Tue, 08 Jul 2025 15:38:28 -0700 (PDT)'
  },
  { name: 'Return-Path', value: '<csheehan630@gmail.com>' },
  {
	name: 'Received',
	value: 'from smtpclient.apple (whitehallh50.w.subnet.rcn.com. [216.80.18.241])\r\n' +
	  '        by smtp.gmail.com with ESMTPSA id 8926c6da1cb9f-503b599a3eesm2356693173.17.2025.07.08.15.38.28\r\n' +
	  '        for <chris@coldets.com>\r\n' +
	  '        (version=TLS1_2 cipher=ECDHE-ECDSA-AES128-GCM-SHA256 bits=128/128);\r\n' +
	  '        Tue, 08 Jul 2025 15:38:28 -0700 (PDT)'
  },
  { name: 'From', value: 'Connor Sheehan <csheehan630@gmail.com>' },
  {
	name: 'X-Google-Original-From',
	value: 'Connor Sheehan <Csheehan630@gmail.com>'
  },
  {
	name: 'Content-Type',
	value: 'multipart/alternative;\r\n' +
	  '\tboundary="Apple-Mail=_D0D57C78-F575-4A0A-89EB-C80278629648"'
  },
  {
	name: 'Mime-Version',
	value: '1.0 (Mac OS X Mail 16.0 \\(3826.600.51.1.1\\))'
  },
  { name: 'Subject', value: 'Re: Test Email with Tracking' },
  { name: 'Date', value: 'Tue, 8 Jul 2025 17:38:17 -0500' },
  {
	name: 'References',
	value: '<010f0197ec24cd1c-8a30e6fb-41b2-45be-ace3-0aa20340e891-000000@us-east-2.amazonses.com>'
  },
  { name: 'To', value: 'chris@coldets.com' },
  {
	name: 'In-Reply-To',
	value: '<010f0197ec24cd1c-8a30e6fb-41b2-45be-ace3-0aa20340e891-000000@us-east-2.amazonses.com>'
  },
  {
	name: 'Message-Id',
	value: '<03EBA737-7D20-42EA-9B53-7039DD55BEA8@gmail.com>'
  },
  { name: 'X-Mailer', value: 'Apple Mail (2.3826.600.51.1.1)' }
]
*/

export async function findOrCreateEmailThread(
	notification: SesSnsNotification,
	sender: string
): Promise<{ thread: EmailThread; emails: Email[]; replyToMessageId: string }> {
	//   { name: 'Subject', value: 'Re: Test Email with Tracking' },
	const subject = notification.mail.commonHeaders.subject || '';
	const headers = notification.mail.headers || [];
	let thread: EmailThread | null = null;

	const inReplyToHeader = headers.find(
		(h) => h.name.toLowerCase() === 'in-reply-to'
	)?.value;
	const referencesHeader = headers.find(
		(h) => h.name.toLowerCase() === 'references'
	)?.value;

	// PRIMARY THREAD LOOKUP: In-Reply-To header
	// Contains the Message-ID of the email this is directly replying to
	// Example: <010f0197ec379e7d-224bd427-ed93-4592-93b8-d6440b6ef347-000000@us-east-2.amazonses.com>
	// This is the most reliable way to maintain thread continuity
	const inReplyToMessageId = inReplyToHeader
		? extractMessageIdFromEmailHeader(inReplyToHeader)
		: null;

	// FALLBACK THREAD LOOKUP: References header  
	// Contains chronological list of all Message-IDs in this thread
	// We take the last/most recent one as it's usually the immediate parent
	// This helps when In-Reply-To is missing but References shows thread history
	let referencesMessageId: string | null = null;
	if (referencesHeader) {
		const refIds = referencesHeader.split(WHITESPACE_REGEX);
		const lastRef = refIds.at(-1);
		referencesMessageId = lastRef
			? extractMessageIdFromEmailHeader(lastRef)
			: null;
	}

	// Try to find existing thread using In-Reply-To first (most reliable)
	if (inReplyToMessageId) {
		thread = await getThreadByMessageId(inReplyToMessageId);
	}

	// Fallback: Try References if In-Reply-To didn't find a thread
	if (!thread && referencesMessageId) {
		thread = await getThreadByMessageId(referencesMessageId);
	}

	if (!thread) {
		const debtors = await getDebtsByDebtorEmail(sender);
		if (!debtors.length) {
			throw new Error('No debtor found for sender email');
		}
		thread = await createEmailThread(debtors[0].debtorId, subject);
	}

	// 4. Get email history for this thread (chronologically sorted)
	const emails = await getEmailsByThreadId(thread.id);

	// 5. Determine the replyToMessageId for the inbound email
	let replyToMessageId: string | null = null;
	const inReplyToHeaderValue = headers.find(
		(h) => h.name.toLowerCase() === 'in-reply-to'
	)?.value;
	if (inReplyToHeaderValue) {
		replyToMessageId = extractMessageIdFromEmailHeader(inReplyToHeaderValue);
	}

	return { thread, emails, replyToMessageId: replyToMessageId || '' };
}

export function parseInboundEmailSender(
	mail: SesSnsNotification['mail']
): string {
	// TODO: from is of the form Connor Sheehan <csheehan630@gmail.com>
	// const sender = mail.commonHeaders.from?.[0];
	const sender = mail.commonHeaders.returnPath;
	if (!sender) {
		throw new Error('Could not parse sender email from mail headers');
	}
	return sender;
}

export function parseInboundEmailContent(content?: string): string {
	if (!content) {
		throw new Error('Email content is required but was not provided');
	}
	return content;
}

export async function sendEmailResponse({
	to,
	emailResponse,
	thread,
	debt,
	replyToMessageId,
}: SendEmailResponseParams): Promise<Email> {
	const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@yourdomain.com';

	const emailHtml = await render(EmailResponseEmail({ emailResponse }));

	const sentMessageId = await sendEmail({
		to,
		from: fromEmail,
		subject: emailResponse.subject,
		htmlBody: emailHtml,
		inReplyToMessageId: replyToMessageId,
		configurationSetName: 'email-tracking-config',
	});

	const savedEmail = await createEmail({
		debtId: debt.id,
		threadId: thread.id,
		messageId: sentMessageId,
		direction: 'outbound',
		subject: emailResponse.subject,
		content: emailHtml,
		aiGenerated: true,
		complianceChecked: true,
		replyTo: replyToMessageId,
	});

	return savedEmail;
}
