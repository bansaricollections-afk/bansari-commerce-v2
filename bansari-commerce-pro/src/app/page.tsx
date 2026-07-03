import Header from "../components/layout/Header";
import Hero from "../components/home/Hero";
import CategoryGrid from "../components/home/CategoryGrid";
import FeaturedProducts from "../components/home/FeaturedProducts";
import WhyChooseUs from "../components/home/WhyChooseUs";
import Footer from "../components/layout/Footer";
import InstagramGallery from "../components/home/InstagramGallery";

export default function Home() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <CategoryGrid />
        <FeaturedProducts />
        <WhyChooseUs />
        <InstagramGallery />
      </main>

      <Footer />
    </>
  );
}