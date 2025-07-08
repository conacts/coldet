import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from '@react-email/components';
import { container, content, header, logo, main } from '@/emails/design-tokens';
import type { EmailResponse } from '@/lib/llms';

export const EmailResponseEmail = ({
	emailResponse = {
		subject: 'Test Email',
		body: 'This is a test email to verify SES tracking is working.',
		signature: 'Best regards, The Coldets Team',
	},
}: {
	emailResponse?: EmailResponse;
}) => {
	return (
		<Html lang="en">
			<Head>
				<div
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Acceptable for SES tracking pixel
					dangerouslySetInnerHTML={{ __html: '{{ses:openTracker}}' }}
					style={{ display: 'none' }}
				/>
			</Head>
			<Preview>{emailResponse.subject}</Preview>
			<Body style={main}>

				<Container style={container}>
					{/* Header Section */}
					<Section style={header}>
						<Text style={logo}>Coldets</Text>
					</Section>

					{/* Main Content */}
					<Section style={content}>
						<Text>{emailResponse.body}</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

export default EmailResponseEmail;
