from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import secrets

ROOT = Path(__file__).resolve().parent.parent
ORDERS_FILE = ROOT / "data" / "orders.json"
ORDERS_FILE.parent.mkdir(exist_ok=True)
if not ORDERS_FILE.exists():
    ORDERS_FILE.write_text("[]", encoding="utf-8")


def read_orders():
    try:
        return json.loads(ORDERS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []


def write_orders(orders):
    ORDERS_FILE.write_text(json.dumps(orders, ensure_ascii=False, indent=2), encoding="utf-8")


class StoreHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        relative_path = super().translate_path(path)
        requested = path.split("?", 1)[0].strip("/")
        if requested and "/" not in requested:
            return str(ROOT / "html" / requested)
        if not requested:
            return str(ROOT / "html" / "project.html")
        return relative_path

    def do_GET(self):
        if self.path == "/api/health":
            self.send_json(200, {"ok": True, "service": "helpgar-local-store"})
            return
        if self.path == "/api/orders":
            self.send_json(200, read_orders())
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/orders/status":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                data = json.loads(self.rfile.read(length) or b"{}")
                allowed_statuses = ["جدید", "تأیید شد", "در حال آماده‌سازی", "ارسال شد", "تکمیل شد", "لغو شد"]
                if not data.get("id") or data.get("status") not in allowed_statuses:
                    self.send_json(400, {"error": "وضعیت سفارش معتبر نیست."})
                    return
                orders = read_orders()
                order = next((item for item in orders if item.get("id") == str(data["id"])), None)
                if order is None:
                    self.send_json(404, {"error": "سفارش پیدا نشد."})
                    return
                order["status"] = data["status"]
                write_orders(orders)
                self.send_json(200, {"ok": True, "order": order})
            except (ValueError, json.JSONDecodeError):
                self.send_json(400, {"error": "اطلاعات سفارش معتبر نیست."})
            return

        if self.path != "/api/orders":
            self.send_json(404, {"error": "مسیر پیدا نشد."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length) or b"{}")
            if not data.get("name") or not data.get("phone") or not data.get("address") or not data.get("items"):
                self.send_json(400, {"error": "نام، شماره تماس، آدرس و حداقل یک محصول لازم است."})
                return
            items = [{
                "name": str(item.get("name", "")).strip(),
                "price": float(item.get("price", 0) or 0),
                "quantity": max(1, int(item.get("quantity", 1) or 1)),
                "image": str(item.get("image", ""))
            } for item in data["items"]]
            order = {
                "id": f"HG-{int(datetime.now().timestamp() * 1000)}-{secrets.token_hex(3)}",
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "status": "جدید",
                "name": str(data["name"]).strip(),
                "phone": str(data["phone"]).strip(),
                "address": str(data["address"]).strip(),
                "items": items,
                "total": sum(item["price"] * item["quantity"] for item in items)
            }
            orders = read_orders()
            orders.append(order)
            write_orders(orders)
            self.send_json(201, {"ok": True, "order": order})
        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {"error": "اطلاعات سفارش معتبر نیست."})

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 3000), StoreHandler)
    print("Helpgar local store: http://127.0.0.1:3000/")
    server.serve_forever()
