import { withAuth } from 'next-auth/middleware';

export const proxy = withAuth({
	pages: {
		signIn: '/login',
	},
});

export const config = {
	matcher: [
		'/dashboard/:path*',
		'/house-types/:path*',
		'/units/:path*',
		'/tenants/:path*',
		'/payments/:path*',
		'/services/:path*',
		'/account/:path*',
		'/admin/:path*',
	],
};
