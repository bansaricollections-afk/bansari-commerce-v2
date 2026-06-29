import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function Home() {
  return (
    <>
      <Header />

      <main className="min-h-screen">

        <section className="flex h-[80vh] items-center justify-center bg-[#FFFDF9]">
          <div className="text-center">

            <p className="text-sm tracking-[8px] text-[#8A5A6A]">
              NEW COLLECTION
            </p>

            <h1 className="mt-6 text-6xl font-bold">
              Wear What Words
              <br />
              Cannot Say
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-gray-600">
              Discover timeless ethnic wear crafted for every occasion.
            </p>

            <button className="mt-10 rounded-full bg-[#8A5A6A] px-10 py-4 text-white transition hover:bg-[#714857]">
              Shop Collection
            </button>

          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}

