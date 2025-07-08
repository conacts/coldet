import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from '@react-email/components';
import {
	borderRadius,
	button,
	buttonContainer,
	container,
	content,
	emailColors,
	h1,
	header,
	hr,
	infoBox,
	infoText,
	infoTitle,
	logo,
	main,
	spacing,
	text,
	typography,
} from '@/emails/design-tokens';

export const TestEmail = () => (
	<Html lang="en">
		<Head>
			<div
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Acceptable for SES tracking pixel
				dangerouslySetInnerHTML={{ __html: '{{ses:openTracker}}' }}
				style={{ display: 'none' }}
			/>
		</Head>
		<Preview>Test email to verify SES tracking is working</Preview>
		<Body style={main}>
			<Container style={container}>
				{/* Header Section */}
				<Section style={header}>
					<Text style={logo}>Coldets</Text>
				</Section>

				{/* Main Content */}
				<Section style={content}>
					<Heading style={h1}>Test Email</Heading>

					<Text style={text}>
						This is a test email to verify SES tracking is working perfectly.
					</Text>

					<Section style={buttonContainer}>
						<Button href="https://coldets.com" style={button}>
							Click to Test Tracking
						</Button>
					</Section>

					<Hr style={hr} />

					<Section style={infoBox}>
						<Text style={infoTitle}>🎯 Testing Features:</Text>
						<Text style={infoText}>• Email open tracking</Text>
						<Text style={infoText}>• Link click tracking</Text>
						<Text style={infoText}>• Beautiful responsive design</Text>
					</Section>
				</Section>
			</Container>
		</Body>
	</Html>
);

export default TestEmail;
