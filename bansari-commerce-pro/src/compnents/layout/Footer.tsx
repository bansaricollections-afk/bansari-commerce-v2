export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16">

        <h2 className="text-3xl font-bold">
          Bansari Collections
        </h2>

        <p className="mt-4 max-w-md text-gray-600">
          Wear What Words Cannot Say
        </p>

        <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">

          <div>
            <h4 className="font-semibold">Shop</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Sarees</li>
              <li>Kurta Sets</li>
              <li>Gowns</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Customer</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Track Order</li>
              <li>Returns</li>
              <li>Shipping</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Company</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>About</li>
              <li>Contact</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold">Support</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>FAQ</li>
              <li>Privacy Policy</li>
            </ul>
          </div>

        </div>

      </div>
    </footer>
  );
}
