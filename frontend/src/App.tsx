import { useEffect, useState } from "react";
import axios from "axios";
const API = "http://localhost:5000";
type Product = {
  id: string;
  name: string;
  price: string;
  stock: number;
  status: string;
};
type Reservation = { reservationId: string; status: string; expiresAt: string };
export default function App() {
  const [product, setProduct] = useState<Product | null>(null),
    [reservation, setReservation] = useState<Reservation | null>(null),
    [remaining, setRemaining] = useState(0),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [ids, setIds] = useState<{ userId: string; productId: string } | null>(
    null,
  );
  useEffect(() => {
    axios.get(`${API}/api/demo`).catch(() => {});
    fetch(`${API}/api/demo`)
      .then((r) => r.json())
      .then((x) => {
        setIds(x);
        return axios.get(`${API}/api/products/${x.productId}`);
      })
      .then((r) => setProduct(r.data))
      .catch(() => setMessage("Start the backend and refresh."));
  }, []);
  useEffect(() => {
    if (!reservation) return;
    const f = () =>
      setRemaining(
        Math.max(0, new Date(reservation.expiresAt).getTime() - Date.now()),
      );
    f();
    const t = setInterval(f, 1000);
    return () => clearInterval(t);
  }, [reservation]);
  const reserve = async () => {
    if (!ids) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await axios.post(
        `${API}/api/cart/reserve`,
        { userId: ids.userId, productId: ids.productId, quantity: 1 },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      );
      setReservation(r.data);
      setMessage("Product reserved for 5 minutes.");
    } catch (e: any) {
      setMessage(e.response?.data?.error || "Reservation failed");
    } finally {
      setBusy(false);
    }
  };
  const checkout = async () => {
    if (!ids || !reservation) return;
    setBusy(true);
    try {
      const r = await axios.post(
        `${API}/api/order/checkout`,
        { userId: ids.userId, reservationId: reservation.reservationId },
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
      );
      setMessage(`Order confirmed: ${r.data.id}`);
      setReservation(null);
    } catch (e: any) {
      setMessage(e.response?.data?.error || "Checkout failed");
    } finally {
      setBusy(false);
    }
  };
  const time = `${Math.floor(remaining / 60000)}:${String(Math.floor(remaining / 1000) % 60).padStart(2, "0")}`;
  if (!product)
    return (
      <main>
        <div className="card">Loading...</div>
      </main>
    );
  return (
    <main>
      <div className="card">
        <div className="badge">FLASH SALE</div>
        <h1>FlashKart</h1>
        <h2>{product.name}</h2>
        <div className="price">₹{product.price}</div>
        <p>
          Available stock: <b>{product.stock}</b>
        </p>
        {!reservation ? (
          <button disabled={busy} onClick={reserve}>
            {busy ? "Processing..." : "Reserve Product"}
          </button>
        ) : (
          <div className="reservation">
            <span>Reservation expires in</span>
            <div className="timer">{time}</div>
            {remaining > 0 ? (
              <button disabled={busy} onClick={checkout}>
                {busy ? "Processing..." : "Checkout"}
              </button>
            ) : (
              <b>Reservation expired</b>
            )}
          </div>
        )}
        <p className="message">{message}</p>
      </div>
    </main>
  );
}
