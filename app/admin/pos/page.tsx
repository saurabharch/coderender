import { PageHead } from "@/components/admin-ui";
import { PosCounter } from "@/components/pos-counter";

export default function PosPage() {
  return (
    <>
      <PageHead eyebrow="Sell" title="POS Counter"
        blurb="Scan barcodes with the camera (or a scan gun), build the cart, take payment. Mobile-first." />
      <PosCounter />
    </>
  );
}
