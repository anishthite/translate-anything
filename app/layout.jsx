import "./globals.css";

export const metadata = {
  title: "Translate Anything",
  description:
    "Translate Anything is a Google Translate-style Bedrock translator built with Next.js and the Vercel AI SDK."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
