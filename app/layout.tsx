import "@/app/styles/globals.css";

export const metadata = {
  title: "AI 研究助手",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
