import { PlainProviders } from "@/components/plain-providers";

export default function PlainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PlainProviders>{children}</PlainProviders>;
}
