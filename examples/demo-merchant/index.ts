import { fieldFromString } from "@verifytrust/sdk";
import {
  createIssuer,
  encodeCredential,
} from "@verifytrust/merchant-sdk";

const issuer = await createIssuer();
const credential = await issuer.issue({
  merchantId: fieldFromString("nova-goods"),
  productId: fieldFromString("nova-travel-bottle"),
  purchaseTimestamp: BigInt(Math.floor(Date.now() / 1000)),
});

console.log("NOVA GOODS — DEMO MERCHANT");
console.log(`Encoded credential:\n${encodeCredential(credential)}`);
console.log(`Approve this issuerKeyHash for the merchant in IssuerRegistry:\n${issuer.issuerKeyHash}`);
