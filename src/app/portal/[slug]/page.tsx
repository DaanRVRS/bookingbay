import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * /portal/[slug] zelf doet niks — gewoon doorsturen naar login. De
 * /bookings-page checkt de session zelf en stuurt door naar login als
 * 'ie er geen heeft.
 */
export default async function PortalIndexPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/portal/${slug}/login`);
}
