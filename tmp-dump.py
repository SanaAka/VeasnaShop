import io, sys

CART = r"D:\ecommerce api (2)\ecommerce api\veasnashop\client\src\pages\Cart.jsx"
CHECK = r"D:\ecommerce api (2)\ecommerce api\veasnashop\client\src\pages\Checkout.jsx"

def dump(path, label, ranges):
    with io.open(path, "r", encoding="utf-8", newline="") as f:
        lines = f.read().split("\n")
    print("==== %s (%d lines) ====" % (label, len(lines)))
    for (a, b) in ranges:
        print("--- lines %d-%d ---" % (a, b))
        for i in range(a, b + 1):
            if 1 <= i <= len(lines):
                print("%d: %s" % (i, lines[i - 1]))

dump(CART, "Cart.jsx", [(7, 26), (300, 345)])
dump(CHECK, "Checkout.jsx", [(23, 52), (120, 135), (300, 345)])
