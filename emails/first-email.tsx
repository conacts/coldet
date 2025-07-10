import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from '@react-email/components';

export const FirstEmail = () => (
	<Html lang="en">
		<Head>
			<div
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Acceptable for SES tracking pixel
				dangerouslySetInnerHTML={{ __html: '{{ses:openTracker}}' }}
				style={{ display: 'none' }}
			/>
		</Head>
		<Preview>Test email to verify SES tracking is working</Preview>
		<Body className="w-full bg-white font-sans">
			<Container className='mx-auto mb-16 max-w-[600px] rounded-lg bg-white py-6 pb-16'>
				{/* Header Section */}
				<Section className="text-center">
					<Text className='font-bold text-4xl'>Coldets</Text>
				</Section>

				{/* Main Content */}
				<Section className="p-8">
					<Heading className='m-0 mb-6 text-center font-bold text-3xl text-gray-900 leading-tight'>
						Test Email
					</Heading>

					<Text className='my-4 text-base text-gray-600 leading-normal'>
						This is a test email to verify SES tracking is working perfectly.
					</Text>

					<Section className="text-center">
						<Button
							className='inline-block cursor-pointer rounded-lg border-none bg-blue-600 px-6 py-2 text-center font-semibold text-base text-white no-underline'
							href="https://coldets.com"
						>
							Click to Test Tracking
						</Button>
					</Section>

					<Hr className='my-6 border-gray-200' />

					<Section className='my-6 rounded-lg border border-blue-100 bg-blue-50 p-6'>
						<Text className='m-0 mb-2 font-semibold text-base text-blue-800'>
							🎯 Testing Features:
						</Text>
						<Text className='my-1 text-blue-700 text-sm'>
							• Email open tracking
						</Text>
						<Text className='my-1 text-blue-700 text-sm'>
							• Link click tracking
						</Text>
						<Text className='my-1 text-blue-700 text-sm'>
							• Beautiful responsive design
						</Text>
					</Section>
				</Section>
			</Container>
		</Body>
	</Html>
);

export default FirstEmail;
