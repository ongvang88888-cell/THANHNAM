# Certificate Architecture

## Fields

unique public id · student · course · instructor · completion date · verification URL · QR payload (URL only)

## Issuance rules

Configurable: % complete · required quiz pass · admin override

## Public verification

`GET /verify/certificate/{publicId}` — shows name (if consented), course title, date, validity — **no** sensitive PII (email, address, phone).

## Revocation

Admin revoke → verification shows revoked state.
