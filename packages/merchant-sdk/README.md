# `@verifytrust/merchant-sdk`

The merchant SDK creates an issuer key, derives the issuer key hash to approve
in `IssuerRegistry`, and signs private purchase credentials after a real
purchase. A merchant backend can deliver the base64url credential to the
customer's device with `encodeCredential`.

In v1, the customer device generates `customerSecret` and sends it to the
issuer API for signing. The demo issuer therefore sees the secret; blind
issuance is future work. The secret is still kept out of the proof's public
inputs and offchain transaction data.
