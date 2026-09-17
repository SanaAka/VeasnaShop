$ErrorActionPreference = "Stop"
$enc = New-Object System.Text.UTF8Encoding($false)

function Fix($path, $pairs) {
  $raw = [System.IO.File]::ReadAllText($path, $enc)
  $text = $raw
  foreach ($p in $pairs) {
    $old = [string]$p[0]; $new = [string]$p[1]
    $hits = ([regex]::Matches($text, [regex]::Escape($old))).Count
    if ($hits -ne 1) {
      Write-Host ("FAIL hits={0} in {1}: {2}" -f $hits, (Split-Path $path -Leaf), $old.Substring(0,[Math]::Min(60,$old.Length)))
      throw "non-unique or missing"
    }
    $text = $text.Replace($old, $new)
    Write-Host ("OK: {0}" -f $old.Substring(0,[Math]::Min(60,$old.Length)))
  }
  if ($text -ne $raw) {
    [System.IO.File]::WriteAllText($path, $text, $enc)
    Write-Host ("WROTE {0}" -f $path)
  }
}

$cart = "D:\ecommerce api (2)\ecommerce api\veasnashop\client\src\pages\Cart.jsx"
$check = "D:\ecommerce api (2)\ecommerce api\veasnashop\client\src\pages\Checkout.jsx"

Write-Host "############ Cart.jsx ############"
Fix $cart @(
  ,@("  const tax = 22.6;
  const total = subtotal + wrapFee + shipping + tax;",
     "  const tax = Math.round((subtotal + wrapFee) * 0.0825 * 100) / 100;
  const discount = promoCode ? Math.round((subtotal + wrapFee + shipping + tax) * 0.15 * 100) / 100 : 0;
  const total = Math.max(0, subtotal + wrapFee + shipping + tax - discount);")
  ,@("  const applyPromo = () => {
    if (promo.trim().toUpperCase() === ""BOTANICAL15"") setAppliedPromo(true);
  };",
     "  const handleApplyPromo = () => {
    if (applyPromo(promo)) setPromo("""");
  };")
  ,@("                    {appliedPromo ? (",
     "                    {promoCode ? (")
  ,@("onClick={applyPromo}>",
     "onClick={handleApplyPromo}>")
  ,@("${appliedPromo ? (total * 0.85).toFixed(2) : total.toFixed(2)}",
     "${total.toFixed(2)}")
)

Write-Host "############ Checkout.jsx ############"
Fix $check @(
  ,@("  const { items, clearCart } = useCart();",
     "  const { items, promoCode, clearCart } = useCart();")
  ,@("          promoCode: null,",
     "          promoCode,")
)

Write-Host "ALL DONE"
