// Design tokens extracted from globals.css
// These can be used in both web components and React Email

export const colors = {
	// Light theme colors (default)
	background: 'oklch(1 0 0)', // white
	foreground: 'oklch(0.145 0 0)', // dark gray
	card: 'oklch(1 0 0)', // white
	cardForeground: 'oklch(0.145 0 0)', // dark gray
	primary: 'oklch(0.205 0 0)', // dark
	primaryForeground: 'oklch(0.985 0 0)', // near white
	secondary: 'oklch(0.97 0 0)', // light gray
	secondaryForeground: 'oklch(0.205 0 0)', // dark
	muted: 'oklch(0.97 0 0)', // light gray
	mutedForeground: 'oklch(0.556 0 0)', // medium gray
	accent: 'oklch(0.97 0 0)', // light gray
	accentForeground: 'oklch(0.205 0 0)', // dark
	destructive: 'oklch(0.577 0.245 27.325)', // red
	border: 'oklch(0.922 0 0)', // light gray border
	input: 'oklch(0.922 0 0)', // light gray
	ring: 'oklch(0.708 0 0)', // medium gray
} as const;

// Convert oklch to hex for better email client support
export const emailColors = {
	background: '#ffffff',
	foreground: '#1a1a1a',
	card: '#ffffff',
	cardForeground: '#1a1a1a',
	primary: '#1e293b',
	primaryForeground: '#f8fafc',
	secondary: '#f1f5f9',
	secondaryForeground: '#1e293b',
	muted: '#f1f5f9',
	mutedForeground: '#64748b',
	accent: '#f1f5f9',
	accentForeground: '#1e293b',
	destructive: '#ef4444',
	border: '#e2e8f0',
	input: '#e2e8f0',
	ring: '#94a3b8',

	// Blue theme for emails (matching your current design)
	blue: {
		50: '#eff6ff',
		100: '#dbeafe',
		500: '#3b82f6',
		600: '#2563eb',
		700: '#1d4ed8',
		800: '#1e40af',
		900: '#1e3a8a',
	},
} as const;

// Typography scale
export const typography = {
	fontSize: {
		xs: '12px',
		sm: '14px',
		base: '16px',
		lg: '18px',
		xl: '20px',
		'2xl': '24px',
		'3xl': '30px',
		'4xl': '36px',
	},
	fontWeight: {
		normal: '400',
		medium: '500',
		semibold: '600',
		bold: '700',
	},
	lineHeight: {
		tight: '1.25',
		normal: '1.5',
		relaxed: '1.75',
	},
} as const;

// Spacing scale
export const spacing = {
	xs: '4px',
	sm: '8px',
	base: '16px',
	lg: '24px',
	xl: '32px',
	'2xl': '48px',
	'3xl': '64px',
} as const;

// Border radius
export const borderRadius = {
	sm: '4px',
	base: '8px',
	lg: '12px',
	xl: '16px',
	full: '9999px',
} as const; 


export const main = {
	width: '100%',
	backgroundColor: emailColors.background,
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

export const container = {
	margin: '0 auto',
	padding: `${spacing.lg} 0 ${spacing['2xl']}`,
	marginBottom: spacing['3xl'],
	maxWidth: '600px',
	backgroundColor: emailColors.card,
	borderRadius: borderRadius.lg,
};

export const header = {
	textAlign: 'center' as const,
};

export const logo = {
	fontSize: typography.fontSize['4xl'],
	fontWeight: typography.fontWeight.bold,
};

export const content = {
	padding: spacing.xl,
};

export const h1 = {
	color: emailColors.foreground,
	fontSize: typography.fontSize['3xl'],
	fontWeight: typography.fontWeight.bold,
	margin: `0 0 ${spacing.lg} 0`,
	textAlign: 'center' as const,
	lineHeight: typography.lineHeight.tight,
};

export const text = {
	color: emailColors.mutedForeground,
	fontSize: typography.fontSize.base,
	lineHeight: typography.lineHeight.normal,
	margin: `${spacing.base} 0`,
};

export const buttonContainer = {
	textAlign: 'center' as const,
};

export const button = {
	backgroundColor: emailColors.blue[600],
	borderRadius: borderRadius.base,
	color: emailColors.primaryForeground,
	fontSize: typography.fontSize.base,
	fontWeight: typography.fontWeight.semibold,
	textDecoration: 'none',
	textAlign: 'center' as const,
	display: 'inline-block',
	padding: `${spacing.sm} ${spacing.lg}`,
	border: 'none',
	cursor: 'pointer',
};

export const hr = {
	borderColor: emailColors.border,
	margin: `${spacing.lg} 0`,
};

export const infoBox = {
	backgroundColor: emailColors.blue[50],
	border: `1px solid ${emailColors.blue[100]}`,
	borderRadius: borderRadius.base,
	padding: spacing.lg,
	margin: `${spacing.lg} 0`,
};

export const infoTitle = {
	color: emailColors.blue[800],
	fontSize: typography.fontSize.base,
	fontWeight: typography.fontWeight.semibold,
	margin: `0 0 ${spacing.sm} 0`,
};

export const infoText = {
	color: emailColors.blue[700],
	fontSize: typography.fontSize.sm,
	margin: `${spacing.xs} 0`,
};