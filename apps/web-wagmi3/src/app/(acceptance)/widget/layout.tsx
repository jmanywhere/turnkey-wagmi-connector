import { WidgetProviders } from "@/components/widget-providers";

export default function WidgetLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WidgetProviders>{children}</WidgetProviders>;
}
