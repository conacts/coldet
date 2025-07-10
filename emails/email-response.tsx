import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from '@react-email/components';
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
			<Body className="w-full bg-white font-sans">
				<Container className='mx-auto mb-16 max-w-[600px] rounded-lg bg-white py-6 pb-16'>
					{/* Header Section */}
					<Section className="text-center">
						<Text className='font-bold text-4xl'>Coldets</Text>
					</Section>

					{/* Main Content */}
					<Section className="p-8">
						<Text className='my-4 whitespace-pre-wrap text-base text-gray-900 leading-normal'>
							{emailResponse.body}
						</Text>

						<Text className='my-4 mt-8 text-base text-gray-900 leading-normal'>
							{emailResponse.signature}
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

export default EmailResponseEmail;
