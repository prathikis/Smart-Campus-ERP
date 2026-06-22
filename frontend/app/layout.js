import "./globals.css";

export const metadata = {
  title: "SmartCampus ERP - Next-Gen Institutional Management",
  description: "A comprehensive web-based campus management system to automate academic, administrative, and financial operations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
