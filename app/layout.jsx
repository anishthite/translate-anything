import "./globals.css";

export const metadata = {
  title: "Shitty Translate",
  description:
    "A Google Translate-style Bedrock translator built with Next.js and the Vercel AI SDK."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
