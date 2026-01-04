export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-[#121213]">{children}</div>;
}
