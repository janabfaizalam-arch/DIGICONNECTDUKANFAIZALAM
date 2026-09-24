-- ============================================================================
-- PAYMENT LINKS: A SCANNABLE UPI QR OF THEIR OWN — MIGRATION
-- DigiConnect Dukan / RNoS India Pvt Ltd
-- 2026-09-24
-- ============================================================================
--
-- A payment link already renders a QR of its /pay/<code> URL: the customer
-- scans, a page opens, and they pay through Razorpay Checkout. That works in
-- any camera app but costs the customer a page load and a second choice.
--
-- Razorpay's QR Codes API issues a real UPI QR instead: scanned inside GPay,
-- PhonePe or any UPI app, it pays straight away. Razorpay then sends a
-- `qr_code.credited` webhook, which is the only way this payment reaches us --
-- there is no order and no checkout, so none of the order-based bookkeeping
-- fires. The QR's id is therefore the entire link between that webhook and
-- the applications it settles, and it is stored here.
--
-- The link keeps working without any of this: a QR that fails to mint leaves
-- these columns null and the page-based QR unchanged.
-- ============================================================================

ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS razorpay_qr_id text,
  ADD COLUMN IF NOT EXISTS razorpay_qr_image_url text;

-- The webhook arrives carrying only the QR id, so that lookup must be indexed.
CREATE INDEX IF NOT EXISTS idx_payment_links_razorpay_qr_id
  ON public.payment_links(razorpay_qr_id)
  WHERE razorpay_qr_id IS NOT NULL;

COMMENT ON COLUMN public.payment_links.razorpay_qr_id IS
  'Razorpay QR Code id (qr_...). How a qr_code.credited webhook finds this link; null when no QR was minted.';
COMMENT ON COLUMN public.payment_links.razorpay_qr_image_url IS
  'Razorpay-hosted image of the UPI QR, shown to the customer and the partner.';
