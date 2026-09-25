import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import WhatsAppFloat from "@/components/layout/WhatsAppFloat";

export default function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />

      <div className="pb-16 lg:pb-0">
        {children}
      </div>

      <Footer />
      <WhatsAppFloat />
    </>
  );
}
