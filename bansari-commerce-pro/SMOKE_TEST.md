# Bansari Commerce — Production Smoke Test

Run this test immediately after deployment, before announcing launch.
Use an incognito / private browser window for all steps.

---

## 1. Homepage

```
[ ] Open https://bansaricollections.com
[ ] Page loads without errors
[ ] Hero image renders
[ ] Category grid renders with images
[ ] Navigation links all present
[ ] No console errors (F12 → Console)
[ ] No hydration mismatch warnings
[ ] Page title reads: "Bansari Collections — Indian Ethnic Wear"
[ ] Favicon visible in browser tab
```

---

## 2. Product Browsing

```
[ ] Click /shop — product grid renders
[ ] Click /collections — collections render
[ ] Click /new-arrivals — products render
[ ] Click any product card — /product/[id] loads
[ ] Product images load
[ ] Product name, price, description present
[ ] "Add to Cart" button visible
```

---

## 3. Search

```
[ ] Use search bar on storefront
[ ] Enter a product name (e.g., "saree")
[ ] Results appear
[ ] Clicking a result navigates to correct product page
```

---

## 4. Cart

```
[ ] On a product page, click "Add to Cart"
[ ] Cart icon shows item count
[ ] Navigate to /cart
[ ] Cart item shows: name, price, quantity, image
[ ] Increase quantity — subtotal updates
[ ] Remove item — cart empties correctly
[ ] Empty cart shows empty state (not error)
```

---

## 5. Checkout — Payment Success

```
[ ] With 1+ items in cart, click "Proceed to Checkout"
[ ] /checkout loads with order summary
[ ] Fill in:
      Name:         Test Customer
      Email:        your-real-email@example.com
      Phone:        9876543210
      Address:      123 Test Street
      City:         Mumbai
      State:        Maharashtra
      Pincode:      400001
[ ] Click "Place Order"
[ ] Razorpay payment modal opens
[ ] Use Razorpay test card:
      Card:         4111 1111 1111 1111
      Expiry:       12/26
      CVV:          123
      Name:         Test Customer
[ ] Payment succeeds
[ ] Redirected to /order-success
[ ] Order number displayed
[ ] Check Supabase → orders table: order row exists
[ ] Check Supabase → orders table: payment_status = 'paid'
[ ] Check Supabase → products table: stock decremented
[ ] Check Admin → /admin/orders: order visible
```

---

## 6. Checkout — Payment Failure

```
[ ] Add item to cart, proceed to checkout
[ ] Fill in valid customer details
[ ] Click "Place Order"
[ ] Razorpay modal opens
[ ] Use Razorpay failure test card:
      Card:         4000 0000 0000 0002
      Expiry:       12/26
      CVV:          123
[ ] Payment fails
[ ] Redirected to /order-failed (or error shown)
[ ] Supabase orders table: NO order row created (payment failed before order creation)
[ ] Stock NOT decremented
```

---

## 7. Webhook Verification

```
[ ] After a successful test payment, wait 30 seconds
[ ] Check Razorpay Dashboard → Webhooks → Recent Deliveries
[ ] Status: 200 OK for payment.captured event
[ ] Check Supabase orders table: payment_status = 'paid' (set by webhook)
[ ] If webhook shows 400: check RAZORPAY_WEBHOOK_SECRET in Vercel matches Razorpay Dashboard
```

---

## 8. Inventory Reduction

```
[ ] Before test order: note stock of test product in Supabase → products table
[ ] Complete a successful payment for qty: 1
[ ] After order: stock should be (original - 1)
[ ] Verify in Supabase SQL:
      SELECT id, name, stock FROM products WHERE id = <your_test_product_id>;
```

---

## 9. Admin Panel

```
[ ] Open /admin/login in incognito
[ ] Log in with admin credentials
[ ] /admin dashboard loads
[ ] /admin/orders shows the test order
[ ] Click order → /admin/orders/[id] shows full details
[ ] Change order status → status updates
[ ] /admin/products — product list renders
[ ] /admin/inventory — stock levels visible
[ ] /admin/customers — customer list renders
[ ] /admin/analytics — charts render
[ ] Log out → redirected to /admin/login
[ ] Try accessing /admin directly while logged out → redirected to /admin/login
```

---

## 10. Security Checks

```
[ ] Visit /admin without logging in → redirected to /admin/login
[ ] Visit https://yourdomain.com/api/admin/orders without auth
      Expected: HTTP 401 JSON {"error":"Unauthorized"}
[ ] Visit https://yourdomain.com/api/admin/orders with a customer account (non-admin)
      Expected: HTTP 403 JSON {"error":"Forbidden"}
[ ] Check browser console on storefront: no Supabase service role key visible
[ ] Check browser network tab: no requests expose RAZORPAY_KEY_SECRET
```

---

## 11. SEO & Metadata

```
[ ] View page source of homepage
[ ] <title> tag present: "Bansari Collections — Indian Ethnic Wear"
[ ] <meta name="description"> present
[ ] <meta property="og:image"> points to /og-image.jpg
[ ] <link rel="canonical"> present
[ ] Visit https://yourdomain.com/robots.txt — renders correctly
[ ] Visit https://yourdomain.com/sitemap.xml — renders with product URLs
[ ] Visit https://yourdomain.com/nonexistent — 404 page renders (not blank)
```

---

## 12. Policy Pages

```
[ ] /privacy-policy — loads
[ ] /shipping-policy — loads
[ ] /return-refund-policy — loads
[ ] /cancellation-policy — loads
[ ] /terms-and-conditions — loads
[ ] /faq — loads
[ ] /about — loads
[ ] /contact — loads
```

---

## Pass Criteria

All checkboxes must be ticked before announcing launch.

If any step fails:
1. Check Vercel deployment logs
2. Check Supabase logs (Dashboard → Logs)
3. Check Razorpay webhook delivery logs
4. Fix the issue, redeploy, and re-run the full smoke test from Step 1.
